import { z } from 'zod';
import { RazorpayService } from '../services/razorpayService.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';
import { config } from '../config/index.js';
import { orderLock } from '../utils/keyedAsyncLock.js';
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
     * Creates a payment order, registers in DB, and returns Razorpay Order ID + Public Key ID.
     * Completely serialized per freshcart_order_id to eliminate concurrency race conditions.
     */
    static async createOrder(req, res, next) {
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
            console.log(`[OrderController] Processing createOrder for ${freshcart_order_id} (Amount: ₹${amount} ${currency})`);
            // Serialize the complete order-creation workflow per freshcart_order_id
            // to eliminate concurrent-request race conditions and database desynchronization
            await orderLock.runExclusive(freshcart_order_id, async () => {
                // Step 1: Duplicate payment protection / Idempotency check:
                const existingOrder = PaymentPersistenceService.getOrderByFreshCartId(freshcart_order_id);
                // Safeguard 1: Never overwrite or reuse an already paid or authorized order
                if (existingOrder && (existingOrder.status === 'CAPTURED' || existingOrder.status === 'AUTHORIZED')) {
                    res.status(409).json({
                        success: false,
                        error: `Order ${freshcart_order_id} has already been paid for and captured.`,
                        status: existingOrder.status,
                        razorpay_order_id: existingOrder.razorpay_order_id,
                    });
                    return;
                }
                // Step 2: Idempotency & Conflict Check on Existing Order
                if (existingOrder) {
                    const isMatchingAmount = existingOrder.amount === amount;
                    const isMatchingCurrency = (existingOrder.currency || 'INR').toUpperCase() === currency.toUpperCase();
                    if (isMatchingAmount && isMatchingCurrency && existingOrder.status === 'CREATED' && existingOrder.razorpay_order_id) {
                        console.log(`[OrderController] Idempotent hit: Reusing active Razorpay order ${existingOrder.razorpay_order_id} for ${freshcart_order_id}`);
                        res.status(200).json({
                            success: true,
                            data: {
                                key_id: config.razorpay.keyId,
                                razorpay_order_id: existingOrder.razorpay_order_id,
                                freshcart_order_id,
                                amount: existingOrder.amount,
                                amount_in_paise: existingOrder.amount_in_paise,
                                currency: existingOrder.currency,
                                customer,
                                payment_mode: config.paymentMode,
                                is_simulated: existingOrder.razorpay_order_id.startsWith('order_sim_') || false,
                            },
                        });
                        return;
                    }
                    // If amounts or currencies conflict, REJECT with 409 Conflict!
                    // Never overwrite or update the order with mismatched values.
                    console.warn(`[OrderController] Order modification conflict for ${freshcart_order_id}: existing is ₹${existingOrder.amount} ${existingOrder.currency}, but received request for ₹${amount} ${currency}`);
                    res.status(409).json({
                        success: false,
                        error: `Concurrent order modification conflict for ${freshcart_order_id}: an active order exists for ₹${existingOrder.amount} ${existingOrder.currency}, but received request for ₹${amount} ${currency}.`,
                        status: existingOrder.status,
                        existing_amount: existingOrder.amount,
                        existing_currency: existingOrder.currency,
                        requested_amount: amount,
                        requested_currency: currency,
                    });
                    return;
                }
                // Step 3: No order exists yet in DB for this freshcart_order_id.
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
                // Step 4: Persist newly created order in DB
                try {
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
                catch (insertError) {
                    // Defense-in-depth: SQLite insert-conflict safeguards (e.g. across multiple worker processes)
                    if (insertError.message?.includes('UNIQUE constraint failed') ||
                        insertError.code === 'SQLITE_CONSTRAINT' ||
                        insertError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                        console.log(`[OrderController] Insert conflict detected for ${freshcart_order_id}. Validating committed order...`);
                        const committedOrder = PaymentPersistenceService.getOrderByFreshCartId(freshcart_order_id);
                        if (committedOrder) {
                            if (committedOrder.status === 'CAPTURED' || committedOrder.status === 'AUTHORIZED') {
                                res.status(409).json({
                                    success: false,
                                    error: `Order ${freshcart_order_id} has already been paid for and captured.`,
                                    status: committedOrder.status,
                                    razorpay_order_id: committedOrder.razorpay_order_id,
                                });
                                return;
                            }
                            const isExactMatch = committedOrder.freshcart_order_id === freshcart_order_id &&
                                committedOrder.amount === amount &&
                                committedOrder.amount_in_paise === Math.round(amount * 100) &&
                                (committedOrder.currency || 'INR').toUpperCase() === currency.toUpperCase();
                            if (isExactMatch && committedOrder.status === 'CREATED' && committedOrder.razorpay_order_id) {
                                console.log(`[OrderController] Matching order reuse for ${freshcart_order_id} (Amount: ₹${amount})`);
                                res.status(200).json({
                                    success: true,
                                    data: {
                                        key_id: config.razorpay.keyId,
                                        razorpay_order_id: committedOrder.razorpay_order_id,
                                        freshcart_order_id,
                                        amount: committedOrder.amount,
                                        amount_in_paise: committedOrder.amount_in_paise,
                                        currency: committedOrder.currency,
                                        customer,
                                        payment_mode: config.paymentMode,
                                        is_simulated: committedOrder.razorpay_order_id.startsWith('order_sim_') || false,
                                    },
                                });
                                return;
                            }
                            res.status(409).json({
                                success: false,
                                error: `Concurrent order modification conflict for ${freshcart_order_id}: an active order exists for ₹${committedOrder.amount} ${committedOrder.currency}, but received concurrent request for ₹${amount} ${currency}.`,
                                status: committedOrder.status,
                                existing_amount: committedOrder.amount,
                                existing_currency: committedOrder.currency,
                                requested_amount: amount,
                                requested_currency: currency,
                            });
                            return;
                        }
                    }
                    throw insertError;
                }
                // Step 5: Return 201 Created with the verified newly created order
                console.log(`[OrderController] Created new Razorpay order ${razorpayOrder.id} for ${freshcart_order_id}`);
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
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/orders/:orderId
     * Retrieves order status by Fresh-Cart Order ID or Razorpay Order ID
     */
    static async getOrder(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
}
