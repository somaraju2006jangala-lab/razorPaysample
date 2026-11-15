import { razorpayInstance, config } from '../config/index.js';
import { verifyPaymentSignature, verifyWebhookSignature, generateTestSignature } from '../utils/cryptoUtils.js';
export class RazorpayService {
    /**
     * Creates a Razorpay Order using Orders API
     */
    static async createOrder(params) {
        const amountInPaise = Math.round(params.amount * 100);
        const currency = params.currency || config.defaultCurrency;
        try {
            // If live or configured with valid API keys, use Razorpay SDK directly
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: amountInPaise,
                currency,
                receipt: params.receipt,
                notes: params.notes || {},
            });
            return {
                id: razorpayOrder.id,
                amount: Number(razorpayOrder.amount) / 100,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt || params.receipt,
                status: razorpayOrder.status,
            };
        }
        catch (error) {
            // In development / demo mode with placeholder keys, provide simulated order for local UI/UX testing
            if (config.paymentMode === 'test' && config.razorpay.isDummyKey) {
                console.warn('⚠️ Razorpay test keys not configured or authentication failed. Creating simulated test order for local testing.');
                const simulatedOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
                return {
                    id: simulatedOrderId,
                    amount: params.amount,
                    currency,
                    receipt: params.receipt,
                    status: 'created',
                    isSimulated: true,
                };
            }
            throw error;
        }
    }
    /**
     * Fetches order details from Razorpay
     */
    static async fetchOrder(orderId) {
        try {
            return await razorpayInstance.orders.fetch(orderId);
        }
        catch (error) {
            if (config.paymentMode === 'test' && config.razorpay.isDummyKey) {
                return { id: orderId, status: 'created' };
            }
            throw error;
        }
    }
    /**
     * Fetches payment details from Razorpay (method, status, card, vpa, etc.)
     */
    static async fetchPayment(paymentId) {
        try {
            return await razorpayInstance.payments.fetch(paymentId);
        }
        catch (error) {
            if (config.paymentMode === 'test' && config.razorpay.isDummyKey) {
                return {
                    id: paymentId,
                    status: 'captured',
                    method: 'upi',
                    vpa: 'user@okhdfcbank',
                    amount: 99000,
                    currency: 'INR',
                };
            }
            throw error;
        }
    }
    /**
     * Initiates a refund through Razorpay Payments Refund API
     */
    static async refundPayment(params) {
        const { paymentId, amount, notes, speed = 'optimum', receipt } = params;
        const amountInPaise = amount ? Math.round(amount * 100) : undefined;
        try {
            const refundOptions = {
                speed,
                notes: notes || {},
            };
            if (amountInPaise) {
                refundOptions.amount = amountInPaise;
            }
            if (receipt) {
                refundOptions.receipt = receipt;
            }
            const refund = await razorpayInstance.payments.refund(paymentId, refundOptions);
            return {
                id: refund.id,
                payment_id: refund.payment_id,
                amount: Number(refund.amount) / 100,
                currency: refund.currency,
                status: refund.status,
                speed_processed: refund.speed_processed || speed,
            };
        }
        catch (error) {
            if (config.paymentMode === 'test' && config.razorpay.isDummyKey) {
                console.warn('⚠️ Initiating simulated refund for demo mode.');
                const simulatedRefundId = `rfnd_${Math.random().toString(36).substring(2, 12)}`;
                return {
                    id: simulatedRefundId,
                    payment_id: paymentId,
                    amount: amount || 990,
                    currency: 'INR',
                    status: 'processed',
                    speed_processed: speed,
                    isSimulated: true,
                };
            }
            throw error;
        }
    }
    /**
     * Cryptographically verifies Razorpay Payment Signature
     */
    static verifySignature(orderId, paymentId, signature) {
        if (config.paymentMode === 'test' && config.razorpay.isDummyKey) {
            // In test mode with dummy keys, verify either real HMAC or simulated signature
            const valid = verifyPaymentSignature({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
            });
            if (valid)
                return true;
            // Allow test fallback signature
            return signature === generateTestSignature(orderId, paymentId) || signature === 'simulated_valid_signature';
        }
        return verifyPaymentSignature({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
        });
    }
    /**
     * Cryptographically verifies Razorpay Webhook Signature
     */
    static verifyWebhook(rawBody, signature) {
        return verifyWebhookSignature(rawBody, signature, config.razorpay.webhookSecret);
    }
}
