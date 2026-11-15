import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RazorpayService } from '../services/razorpayService.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';

const verifyPaymentSchema = z.object({
  freshcart_order_id: z.string().min(1, 'freshcart_order_id is required'),
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
});

export class PaymentController {
  /**
   * POST /api/payments/verify
   * Cryptographically verifies payment signature and updates transaction status
   */
  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Missing required payment verification parameters',
          details: parsed.error.issues,
        });
        return;
      }

      const { freshcart_order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

      // 1. Fetch order from DB
      const order = PaymentPersistenceService.getOrderByFreshCartId(freshcart_order_id);
      if (!order) {
        res.status(404).json({
          success: false,
          error: `Order ${freshcart_order_id} not found in database. Cannot verify payment.`,
        });
        return;
      }

      // 2. Validate cryptographic signature
      const isSignatureValid = RazorpayService.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isSignatureValid) {
        console.error(`❌ Cryptographic signature mismatch for order ${freshcart_order_id}, payment ${razorpay_payment_id}`);
        
        // Record failed transaction for security audit
        PaymentPersistenceService.recordTransaction({
          freshcart_order_id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          amount: order.amount,
          currency: order.currency,
          status: 'FAILED',
          error_code: 'SIGNATURE_VERIFICATION_FAILED',
          error_description: 'Cryptographic signature mismatch. Possible tampering or invalid secret key.',
          signature_verified: false,
        });

        res.status(400).json({
          success: false,
          error: 'Payment verification failed: Invalid cryptographic signature.',
          status: 'FAILED',
        });
        return;
      }

      // 3. Fetch payment details from Razorpay to extract real method & bank info
      let paymentDetails: any = null;
      try {
        paymentDetails = await RazorpayService.fetchPayment(razorpay_payment_id);
      } catch (e) {
        console.warn('Could not fetch remote payment details:', e);
      }

      const method = paymentDetails?.method || 'upi';
      const bank = paymentDetails?.bank || null;
      const wallet = paymentDetails?.wallet || null;
      const vpa = paymentDetails?.vpa || null;
      const cardNetwork = paymentDetails?.card?.network || null;
      const cardType = paymentDetails?.card?.type || null;

      // 4. Save verified transaction in database
      const transaction = PaymentPersistenceService.recordTransaction({
        freshcart_order_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: order.amount,
        currency: order.currency,
        status: 'CAPTURED',
        method,
        bank,
        wallet,
        vpa,
        card_network: cardNetwork,
        card_type: cardType,
        signature_verified: true,
        raw_payload: paymentDetails,
      });

      console.log(`✅ Payment verified successfully: Payment ID ${razorpay_payment_id} for Order ${freshcart_order_id}`);

      // 5. Return verified receipt information
      res.status(200).json({
        success: true,
        message: 'Payment verified and captured successfully',
        data: {
          verified: true,
          status: 'CAPTURED',
          transaction_id: transaction.id,
          razorpay_payment_id: transaction.razorpay_payment_id,
          razorpay_order_id: transaction.razorpay_order_id,
          freshcart_order_id: transaction.freshcart_order_id,
          amount: transaction.amount,
          currency: transaction.currency,
          method: transaction.method,
          payment_details: {
            bank: transaction.bank,
            wallet: transaction.wallet,
            vpa: transaction.vpa,
            card_network: transaction.card_network,
          },
          customer: {
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
          },
          timestamp: transaction.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/report-failure
   * Safely captures client-side payment dismissal or cancellation
   */
  static async reportFailure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { freshcart_order_id, razorpay_order_id, error_code, error_description } = req.body;

      if (!freshcart_order_id) {
        res.status(400).json({ success: false, error: 'freshcart_order_id is required' });
        return;
      }

      const order = PaymentPersistenceService.getOrderByFreshCartId(freshcart_order_id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      const paymentId = req.body.razorpay_payment_id || `failed_${Date.now()}`;

      PaymentPersistenceService.recordTransaction({
        freshcart_order_id,
        razorpay_order_id: razorpay_order_id || order.razorpay_order_id || 'unassigned',
        razorpay_payment_id: paymentId,
        amount: order.amount,
        currency: order.currency,
        status: 'FAILED',
        error_code: error_code || 'PAYMENT_CANCELLED_OR_FAILED',
        error_description: error_description || 'Customer dismissed checkout or payment failed at gateway.',
        signature_verified: false,
      });

      res.status(200).json({
        success: true,
        message: 'Payment failure logged',
        order_status: 'FAILED',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/status/:identifier
   * Polls verified payment status for an order
   */
  static async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identifier = String(req.params.identifier);

      // Look up by payment ID or Fresh-Cart Order ID
      let tx = PaymentPersistenceService.getTransactionByPaymentId(identifier);
      if (!tx) {
        tx = PaymentPersistenceService.getTransactionByFreshCartOrderId(identifier);
      }

      if (!tx) {
        // Fallback: check order table
        const order = PaymentPersistenceService.getOrderByFreshCartId(identifier);
        if (!order) {
          res.status(404).json({ success: false, error: 'Transaction or Order not found' });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            status: order.status,
            freshcart_order_id: order.freshcart_order_id,
            amount: order.amount,
            currency: order.currency,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          status: tx.status,
          verified: tx.signature_verified === 1,
          transaction_id: tx.id,
          razorpay_payment_id: tx.razorpay_payment_id,
          razorpay_order_id: tx.razorpay_order_id,
          freshcart_order_id: tx.freshcart_order_id,
          amount: tx.amount,
          currency: tx.currency,
          method: tx.method,
          created_at: tx.created_at,
          error_code: tx.error_code,
          error_description: tx.error_description,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/transaction/:id
   * Retrieves full transaction details including refunds
   */
  static async getTransactionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      let tx = PaymentPersistenceService.getTransactionById(id);
      if (!tx) {
        tx = PaymentPersistenceService.getTransactionByPaymentId(id);
      }

      if (!tx) {
        res.status(404).json({ success: false, error: 'Transaction not found' });
        return;
      }

      const order = PaymentPersistenceService.getOrderByFreshCartId(tx.freshcart_order_id);
      const refunds = PaymentPersistenceService.getRefundsForPayment(tx.razorpay_payment_id);

      res.status(200).json({
        success: true,
        data: {
          transaction: tx,
          order,
          refunds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/history
   * Lists transactions with search and filtering
   */
  static async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = PaymentPersistenceService.listTransactions({
        status,
        search,
        startDate,
        endDate,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
