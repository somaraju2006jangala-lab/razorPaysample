import assert from 'assert';
import crypto from 'crypto';
import http from 'http';
import { app } from '../src/app.js';
import { config } from '../src/config/index.js';
import { PaymentPersistenceService } from '../src/services/paymentPersistenceService.js';
import { initDatabase } from '../src/database/db.js';

let server: http.Server;
const BASE_URL = 'http://127.0.0.1:5099';

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }

  return { status: res.status, data: json, headers: res.headers };
}

async function runTests() {
  console.log('🚀 Running Fresh-Cart Payment Gateway Comprehensive Test Suite...\n');
  initDatabase();

  server = app.listen(5099);

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error('     Error:', err.message || err);
      failed++;
    }
  }

  // 1. Admin Authentication
  let adminToken = '';
  await test('Scenario 16: Admin Authentication (Valid & Invalid Credentials)', async () => {
    const invalidRes = await request('/api/admin/login', {
      method: 'POST',
      body: { username: 'wrong', password: 'wrong' },
    });
    assert.strictEqual(invalidRes.status, 401, 'Should reject invalid admin credentials');

    const validRes = await request('/api/admin/login', {
      method: 'POST',
      body: { username: config.admin.username, password: config.admin.password },
    });
    assert.strictEqual(validRes.status, 200, 'Should accept valid admin credentials');
    assert.ok(validRes.data.data.token, 'Should return JWT token');
    adminToken = validRes.data.data.token;
  });

  // 2. Order Creation & Validation
  const testOrderId = `FC-TEST-${Date.now()}`;
  let razorpayOrderId = '';
  await test('Order Creation: Amount, Currency & Customer Validation', async () => {
    // Incorrect amount test
    const invalidAmountRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: 'FC-INVALID-001',
        amount: -50,
        currency: 'INR',
        customer: { name: 'Test', email: 'test@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(invalidAmountRes.status, 400, 'Scenario 8: Incorrect amount should be rejected');

    // Create valid order
    const validRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: testOrderId,
        amount: 850,
        currency: 'INR',
        customer: { name: 'Aarav Gupta', email: 'aarav@example.com', phone: '9811223344' },
      },
    });
    assert.strictEqual(validRes.status, 201, 'Valid order must be created with 201 Created');
    assert.ok(validRes.data.data.razorpay_order_id, 'Must return razorpay_order_id');
    assert.strictEqual(validRes.data.data.key_id, config.razorpay.keyId, 'Must return public key');
    razorpayOrderId = validRes.data.data.razorpay_order_id;
  });

  // 3. Cryptographic Signature Verification (Success & Failure)
  const paymentId = `pay_TEST_${Date.now()}`;
  await test('Scenario 7: Invalid Cryptographic Signature Handling', async () => {
    const invalidSigRes = await request('/api/payments/verify', {
      method: 'POST',
      body: {
        freshcart_order_id: testOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'invalid_malicious_tampered_signature_1234567890',
      },
    });
    assert.strictEqual(invalidSigRes.status, 400, 'Invalid signature must be rejected');
  });

  // 4. Successful Card / UPI Payment Verification
  await test('Scenario 1 & 2: Successful Payment Signature Verification & Database Persistence', async () => {
    // Generate valid HMAC SHA-256 signature
    const text = `${razorpayOrderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(text)
      .digest('hex');

    const verifyRes = await request('/api/payments/verify', {
      method: 'POST',
      body: {
        freshcart_order_id: testOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      },
    });

    assert.strictEqual(verifyRes.status, 200, 'Payment verification should succeed with 200');
    assert.strictEqual(verifyRes.data.data.status, 'CAPTURED', 'Status should be CAPTURED');
    assert.strictEqual(verifyRes.data.data.verified, true, 'Verification boolean should be true');

    // Scenario 14: Check Database persistence
    const savedTx = PaymentPersistenceService.getTransactionByPaymentId(paymentId);
    assert.ok(savedTx, 'Transaction record must exist in SQLite database');
    assert.strictEqual(savedTx.freshcart_order_id, testOrderId, 'Order ID must match');
    assert.strictEqual(savedTx.signature_verified, 1, 'Signature verified flag must be 1 in database');
  });

  // 5. Duplicate Payment Prevention
  await test('Scenario 6: Duplicate Payment Request Protection (Idempotency)', async () => {
    const dupRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: testOrderId,
        amount: 850,
        currency: 'INR',
        customer: { name: 'Aarav Gupta', email: 'aarav@example.com', phone: '9811223344' },
      },
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate payment order creation must return 409 Conflict');
  });

  // 6. Payment Failure / Cancelled Checkout
  await test('Scenario 3 & 4: Failed Transaction & Cancelled Checkout Logging', async () => {
    const cancelOrderId = `FC-CANCEL-${Date.now()}`;
    await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: cancelOrderId,
        amount: 450,
        currency: 'INR',
        customer: { name: 'User Cancelled', email: 'cancel@example.com', phone: '9811223344' },
      },
    });

    const reportRes = await request('/api/payments/report-failure', {
      method: 'POST',
      body: {
        freshcart_order_id: cancelOrderId,
        error_code: 'BAD_REQUEST_CANCELLED',
        error_description: 'User dismissed the payment checkout modal without completing.',
      },
    });

    assert.strictEqual(reportRes.status, 200, 'Failure reporting should succeed');
    const orderCheck = PaymentPersistenceService.getOrderByFreshCartId(cancelOrderId);
    assert.strictEqual(orderCheck?.status, 'FAILED', 'Order status should be updated to FAILED');
  });

  // 7. Webhook Delivery & Duplicate Webhook Idempotency
  await test('Scenario 9 & 10: Webhook Delivery, Signature Verification & Duplicate Protection', async () => {
    const webhookEventId = `evt_${Date.now()}`;
    const webhookPayload = {
      entity: 'event',
      account_id: 'acc_freshcart_demo',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: `pay_webhook_${Date.now()}`,
            entity: 'payment',
            amount: 99000,
            currency: 'INR',
            status: 'captured',
            order_id: 'order_webhook_test',
            notes: { freshcart_order_id: 'FC-DEMO-1001' },
            method: 'upi',
            vpa: 'test@upi',
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
      id: webhookEventId,
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const validWebhookSig = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawPayload)
      .digest('hex');

    // Deliver webhook
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validWebhookSig,
      },
      body: rawPayload,
    });
    assert.strictEqual(webhookRes.status, 200, 'Webhook delivery should return 200 OK');

    // Deliver duplicate webhook
    const dupWebhookRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validWebhookSig,
      },
      body: rawPayload,
    });
    assert.strictEqual(dupWebhookRes.status, 200, 'Duplicate webhook should return 200 OK');
    const dupJson = await dupWebhookRes.json();
    assert.strictEqual(dupJson.message, 'Event already processed', 'Should recognize duplicate event');
  });

  // 8. Refund Initiation & Status
  await test('Scenario 12 & 13: Refund Initiation and Tracking', async () => {
    const refundRes = await request('/api/refunds/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        payment_id: paymentId,
        amount: 850,
        reason: 'Customer requested refund for test order',
      },
    });

    assert.strictEqual(refundRes.status, 200, 'Refund should be initiated successfully');
    assert.ok(refundRes.data.data.razorpay_refund_id, 'Must return refund id');

    const refundId = refundRes.data.data.razorpay_refund_id;
    const statusRes = await request(`/api/refunds/${refundId}`);
    assert.strictEqual(statusRes.status, 200, 'Refund status query should succeed');
    assert.strictEqual(statusRes.data.data.razorpay_refund_id, refundId, 'Refund ID must match');
  });

  // 9. Admin Dashboard Metrics
  await test('Admin Dashboard Metrics & Audit Logs', async () => {
    const statsRes = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(statsRes.status, 200, 'Dashboard stats should return 200');
    assert.ok(statsRes.data.data.totalTransactions >= 1, 'Total transactions should be >= 1');
    assert.ok(statsRes.data.data.totalAmountCollected > 0, 'Amount collected should be > 0');

    const auditRes = await request('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(auditRes.status, 200, 'Audit logs should return 200');
    assert.ok(Array.isArray(auditRes.data.data), 'Audit logs should be an array');
  });

  // Close test server
  server.close();

  console.log(`\n======================================================`);
  console.log(`Test Execution Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});

