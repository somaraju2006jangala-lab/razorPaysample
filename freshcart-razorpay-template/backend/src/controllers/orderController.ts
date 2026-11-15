import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RazorpayService } from '../services/razorpayService.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';
import { config } from '../config/index.js';

const createOrderSchema = z.object({
  freshcart_order_id: z.string().min(3, 'Order ID must be at least 3 characters'),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('INR').refine((c) => c === 'INR', {
    message: 'Only INR currency is currently supported',
  }),
  customer: z.object({
    name: z.string().min(2, 'Customer name is required'),
    email: z.string().email('Valid customer email is required'),
    phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  }),
  items: z.array(z.any()).optional(),
  notes: z.record(z.string(), z.any()).optional(),
});

export class OrderController {
  /**
   * POST /api/orders/create
   * Creates a payment order, registers in DB, and returns Razorpay Order ID + Public Key ID
   */
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
        return;
      }

      const { freshcart_order_id, amount, currency, customer, items, notes } = parsed.data;

      // Duplicate payment protection / Idempotency check:
      const existingOrder = PaymentPersistenceService.getOrderByFreshCartId(freshcart_order_id);
      if (existingOrder && (existingOrder.status === 'CAPTURED' || existingOrder.status === 'AUTHORIZED')) {
        res.status(409).json({
          success: false,
          error: `Order ${freshcart_order_id} has already been paid for and captured.`,
          status: existingOrder.status,
          razorpay_order_id: existingOrder.razorpay_order_id,
        });
        return;
      }

      // Create Razorpay order via official SDK
      const razorpayOrder = await RazorpayService.createOrder({
        amount,
        currency,
        receipt: freshcart_order_id,
        notes: {
          freshcart_order_id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          ...(notes || {}),
        },
      });

      // Persist order in database
      if (existingOrder) {
        // Reuse or update order
        PaymentPersistenceService.updateRazorpayOrderId(freshcart_order_id, razorpayOrder.id);
        PaymentPersistenceService.updateOrderStatus(freshcart_order_id, 'CREATED');
      } else {
        PaymentPersistenceService.createOrder({
          freshcart_order_id,
          razorpay_order_id: razorpayOrder.id,
          amount,
          currency,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          items,
          notes,
        });
      }

      // Return ONLY public key and order metadata
      res.status(201).json({
        success: true,
        data: {
          key_id: config.razorpay.keyId,
          razorpay_order_id: razorpayOrder.id,
          freshcart_order_id,
          amount,
          amount_in_paise: Math.round(amount * 100),
          currency,
          customer,
          payment_mode: config.paymentMode,
          is_simulated: razorpayOrder.isSimulated || false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/:orderId
   * Retrieves order status by Fresh-Cart Order ID or Razorpay Order ID
   */
  static async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = String(req.params.orderId);
      let order = PaymentPersistenceService.getOrderByFreshCartId(orderId);
      if (!order) {
        order = PaymentPersistenceService.getOrderByRazorpayId(orderId);
      }

      if (!order) {
        res.status(404).json({
          success: false,
          error: `Order not found with identifier: ${orderId}`,
        });
        return;
      }

      const tx = PaymentPersistenceService.getTransactionByFreshCartOrderId(order.freshcart_order_id);

      res.status(200).json({
        success: true,
        data: {
          order,
          latest_transaction: tx,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
