import { RazorpayService } from '../services/razorpayService.js';
import { PaymentPersistenceService } from '../services/paymentPersistenceService.js';
export class WebhookController {
    /**
     * POST /api/webhooks/razorpay
     * Handles asynchronous webhook notifications from Razorpay
     */
    static async handleWebhook(req, res, next) {
        const signature = req.headers['x-razorpay-signature'];
        const rawBody = req.rawBody || JSON.stringify(req.body);
        try {
            // 1. Verify Webhook Signature
            const isValid = RazorpayService.verifyWebhook(rawBody, signature);
            if (!isValid) {
                console.error('❌ Invalid Razorpay webhook signature');
                PaymentPersistenceService.logWebhook({
                    event_type: req.body?.event || 'UNKNOWN_INVALID_SIGNATURE',
                    signature_valid: false,
                    payload_json: req.body,
                    error: 'Webhook cryptographic signature verification failed.',
                });
                res.status(400).json({ success: false, error: 'Invalid webhook signature' });
                return;
            }
            const event = req.body.event;
            const eventId = req.body.id;
            const payload = req.body.payload;
            console.log(`🔔 Verified Razorpay Webhook Event: ${event} (Event ID: ${eventId})`);
            // 2. Idempotency Check
            if (eventId && PaymentPersistenceService.isWebhookEventProcessed(eventId)) {
                console.log(`ℹ️ Webhook event ${eventId} already processed. Skipping duplicate execution.`);
                res.status(200).json({ status: 'ok', message: 'Event already processed' });
                return;
            }
            // 3. Process Events
            let paymentEntity = payload?.payment?.entity;
            let orderEntity = payload?.order?.entity;
            let refundEntity = payload?.refund?.entity;
            const razorpayPaymentId = paymentEntity?.id || refundEntity?.payment_id;
            const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
            const freshcartOrderId = paymentEntity?.notes?.freshcart_order_id || orderEntity?.receipt;
            switch (event) {
                case 'payment.captured': {
                    if (freshcartOrderId && razorpayPaymentId) {
                        PaymentPersistenceService.recordTransaction({
                            freshcart_order_id: freshcartOrderId,
                            razorpay_order_id: razorpayOrderId || 'unknown',
                            razorpay_payment_id: razorpayPaymentId,
                            amount: Number(paymentEntity.amount) / 100,
                            currency: paymentEntity.currency || 'INR',
                            status: 'CAPTURED',
                            method: paymentEntity.method,
                            bank: paymentEntity.bank,
                            wallet: paymentEntity.wallet,
                            vpa: paymentEntity.vpa,
                            card_network: paymentEntity.card?.network,
                            card_type: paymentEntity.card?.type,
                            signature_verified: true,
                            raw_payload: paymentEntity,
                        });
                        console.log(`✅ Webhook: Order ${freshcartOrderId} marked CAPTURED`);
                    }
                    break;
                }
                case 'payment.failed': {
                    if (freshcartOrderId && razorpayPaymentId) {
                        PaymentPersistenceService.recordTransaction({
                            freshcart_order_id: freshcartOrderId,
                            razorpay_order_id: razorpayOrderId || 'unknown',
                            razorpay_payment_id: razorpayPaymentId,
                            amount: Number(paymentEntity.amount) / 100,
                            currency: paymentEntity.currency || 'INR',
                            status: 'FAILED',
                            error_code: paymentEntity.error_code || 'PAYMENT_FAILED',
                            error_description: paymentEntity.error_description || 'Payment failed at bank / processor',
                            signature_verified: false,
                            raw_payload: paymentEntity,
                        });
                        console.log(`⚠️ Webhook: Order ${freshcartOrderId} marked FAILED`);
                    }
                    break;
                }
                case 'payment.authorized': {
                    if (freshcartOrderId && razorpayPaymentId) {
                        PaymentPersistenceService.recordTransaction({
                            freshcart_order_id: freshcartOrderId,
                            razorpay_order_id: razorpayOrderId || 'unknown',
                            razorpay_payment_id: razorpayPaymentId,
                            amount: Number(paymentEntity.amount) / 100,
                            currency: paymentEntity.currency || 'INR',
                            status: 'AUTHORIZED',
                            method: paymentEntity.method,
                            signature_verified: true,
                            raw_payload: paymentEntity,
                        });
                    }
                    break;
                }
                case 'refund.processed': {
                    if (refundEntity) {
                        PaymentPersistenceService.recordRefund({
                            razorpay_payment_id: refundEntity.payment_id,
                            razorpay_refund_id: refundEntity.id,
                            amount: Number(refundEntity.amount) / 100,
                            currency: refundEntity.currency || 'INR',
                            status: 'PROCESSED',
                            speed: refundEntity.speed_processed || 'optimum',
                            notes: refundEntity.notes ? JSON.stringify(refundEntity.notes) : null,
                            receipt: refundEntity.receipt || null,
                        });
                        console.log(`🔄 Webhook: Refund ${refundEntity.id} marked PROCESSED`);
                    }
                    break;
                }
                case 'refund.failed': {
                    if (refundEntity) {
                        PaymentPersistenceService.recordRefund({
                            razorpay_payment_id: refundEntity.payment_id,
                            razorpay_refund_id: refundEntity.id,
                            amount: Number(refundEntity.amount) / 100,
                            currency: refundEntity.currency || 'INR',
                            status: 'FAILED',
                        });
                        console.log(`❌ Webhook: Refund ${refundEntity.id} marked FAILED`);
                    }
                    break;
                }
                default:
                    console.log(`ℹ️ Webhook event ${event} recorded without state change.`);
            }
            // Log successful webhook event for auditing
            PaymentPersistenceService.logWebhook({
                event_id: eventId,
                event_type: event,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_order_id: razorpayOrderId,
                signature_valid: true,
                payload_json: req.body,
                processed: true,
            });
            // Always respond with 200 to acknowledge webhook receipt
            res.status(200).json({ status: 'ok', received: true });
        }
        catch (error) {
            console.error('Webhook processing error:', error);
            PaymentPersistenceService.logWebhook({
                event_type: req.body?.event || 'PROCESSING_ERROR',
                signature_valid: true,
                payload_json: req.body,
                processed: false,
                error: error.message,
            });
            res.status(500).json({ status: 'error', message: 'Webhook handler error' });
        }
    }
}
