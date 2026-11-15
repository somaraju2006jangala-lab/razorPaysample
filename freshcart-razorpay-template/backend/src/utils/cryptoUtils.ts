import crypto from 'crypto';
import { config } from '../config/index.js';

/**
 * Validates Razorpay Payment Signature
 * Formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
 */
export function verifyPaymentSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(text)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(razorpay_signature, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    console.error('Error during payment signature verification:', error);
    return false;
  }
}

/**
 * Validates Razorpay Webhook Signature
 * Formula: HMAC-SHA256(rawBody, webhookSecret)
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  receivedSignature: string | undefined,
  secret: string = config.razorpay.webhookSecret
): boolean {
  if (!rawBody || !receivedSignature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('Error during webhook signature verification:', error);
    return false;
  }
}

/**
 * Helper to generate a simulated signature for test/demo mode when testing locally
 */
export function generateTestSignature(orderId: string, paymentId: string): string {
  const text = `${orderId}|${paymentId}`;
  return crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(text)
    .digest('hex');
}

