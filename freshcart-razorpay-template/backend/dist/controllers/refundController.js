import { z } from 'zod';
import { RazorpayService } from '../services/razorpayService.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';
const initiateRefundSchema = z.object({
    payment_id: z.string().min(1, 'Payment ID is required'),
    amount: z.number().positive().optional(),
    notes: z.record(z.string(), z.string()).optional(),
    speed: z.enum(['optimum', 'instant', 'normal']).default('optimum'),
    reason: z.string().optional(),
});
export class RefundController {
    /**
     * POST /api/admin/refunds/initiate
     * Initiates a refund for a captured transaction (Protected: Admin Only)
     */
    static async initiateRefund(req, res, next) {
        try {
            const parsed = initiateRefundSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid refund parameters',
                    details: parsed.error.issues,
                });
                return;
            }
            const { payment_id, amount, notes, speed, reason } = parsed.data;
            // 1. Verify transaction exists and was captured
            const tx = PaymentPersistenceService.getTransactionByPaymentId(payment_id);
            if (!tx) {
                res.status(404).json({ success: false, error: `Transaction with payment ID ${payment_id} not found.` });
                return;
            }
            if (tx.status !== 'CAPTURED' && tx.status !== 'REFUND_INITIATED') {
                res.status(400).json({
                    success: false,
                    error: `Cannot refund transaction in status '${tx.status}'. Only CAPTURED transactions are refundable.`,
                });
                return;
            }
            const refundAmount = amount || tx.amount;
            if (refundAmount > tx.amount) {
                res.status(400).json({
                    success: false,
                    error: `Refund amount (₹${refundAmount}) cannot exceed original transaction amount (₹${tx.amount}).`,
                });
                return;
            }
            // 2. Call Razorpay Refund API
            const rzpRefund = await RazorpayService.refundPayment({
                paymentId: payment_id,
                amount: refundAmount,
                notes: {
                    freshcart_order_id: tx.freshcart_order_id,
                    reason: reason || 'Customer requested refund via Fresh-Cart Admin',
                    ...(notes || {}),
                },
                speed,
                receipt: `RFND-${tx.freshcart_order_id}`,
            });
            // 3. Persist refund record
            const refundRecord = PaymentPersistenceService.recordRefund({
                transaction_id: tx.id,
                razorpay_payment_id: payment_id,
                razorpay_refund_id: rzpRefund.id,
                amount: rzpRefund.amount,
                currency: rzpRefund.currency,
                status: rzpRefund.status.toUpperCase(),
                speed: rzpRefund.speed_processed,
                notes: reason || null,
                receipt: `RFND-${tx.freshcart_order_id}`,
            });
            // 4. Record Admin Audit Log
            PaymentPersistenceService.logAdminAction(req.adminUser?.username || 'admin', 'INITIATE_REFUND', `Initiated refund of ₹${refundAmount} for payment ${payment_id} (Order: ${tx.freshcart_order_id}). Reason: ${reason || 'Not specified'}`, req.ip);
            res.status(200).json({
                success: true,
                message: 'Refund initiated successfully',
                data: refundRecord,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/refunds/:refundId
     * Retrieves status of a refund
     */
    static async getRefundStatus(req, res, next) {
        try {
            const refundId = String(req.params.refundId);
            const refund = PaymentPersistenceService.getRefundByRefundId(refundId);
            if (!refund) {
                res.status(404).json({ success: false, error: 'Refund record not found.' });
                return;
            }
            res.status(200).json({
                success: true,
                data: refund,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
