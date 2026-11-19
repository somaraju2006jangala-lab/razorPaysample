process.env.NODE_ENV = 'test';
import assert from 'assert';
import crypto from 'crypto';
import http from 'http';
import { app } from '../src/app.js';
import { config, razorpayInstance } from '../src/config/index.js';
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

  // Requirement 8: Use mocked Razorpay responses only. Do not make real Razorpay API payment attempts or charges.
  let mockOrderSeq = 1000;
  (razorpayInstance.orders as any).create = async (params: any) => {
    mockOrderSeq++;
    return {
      id: `order_mock_${mockOrderSeq}_${Date.now()}`,
      entity: 'order',
      amount: params.amount,
      amount_paid: 0,
      amount_due: params.amount,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      status: 'created',
      attempts: 0,
      notes: params.notes || {},
      created_at: Math.floor(Date.now() / 1000),
    };
  };

  (razorpayInstance.payments as any).fetch = async (paymentId: string) => {
    return {
      id: paymentId,
      entity: 'payment',
      amount: 50000,
      currency: 'INR',
      status: 'captured',
      order_id: 'order_mock_test',
      method: 'upi',
      captured: true,
      created_at: Math.floor(Date.now() / 1000),
    };
  };

  (razorpayInstance.payments as any).refund = async (paymentId: string, params: any) => {
    return {
      id: `rfnd_mock_${Date.now()}`,
      entity: 'refund',
      amount: params.amount || 50000,
      currency: params.currency || 'INR',
      payment_id: paymentId,
      status: 'processed',
      speed: 'optimum',
      created_at: Math.floor(Date.now() / 1000),
    };
  };

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

  // 4b. Dedicated UPI ₹50 Test with success@razorpay
  await test('UPI Test: ₹50 Payment using success@razorpay & Backend Verification', async () => {
    const upiOrderId = `FC-UPI-SUCCESS-${Date.now()}`;
    const createRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: upiOrderId,
        amount: 50,
        currency: 'INR',
        customer: { name: 'UPI Test User', email: 'upitest@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(createRes.status, 201, 'UPI ₹50 order creation must succeed');
    assert.strictEqual(createRes.data.data.amount, 50, 'Amount must be ₹50');
    assert.strictEqual(createRes.data.data.amount_in_paise, 5000, 'Amount in paise must be 5000');

    const rzpUpiOrderId = createRes.data.data.razorpay_order_id;
    const upiPaymentId = `pay_upi_success_${Date.now()}`;

    // Valid HMAC SHA-256 for success@razorpay
    const sigText = `${rzpUpiOrderId}|${upiPaymentId}`;
    const validUpiSig = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(sigText)
      .digest('hex');

    const verifyUpiRes = await request('/api/payments/verify', {
      method: 'POST',
      body: {
        freshcart_order_id: upiOrderId,
        razorpay_order_id: rzpUpiOrderId,
        razorpay_payment_id: upiPaymentId,
        razorpay_signature: validUpiSig,
      },
    });

    assert.strictEqual(verifyUpiRes.status, 200, 'UPI ₹50 payment verification must succeed');
    assert.strictEqual(verifyUpiRes.data.data.status, 'CAPTURED');
    assert.strictEqual(verifyUpiRes.data.data.amount, 50);

    const savedUpiTx = PaymentPersistenceService.getTransactionByPaymentId(upiPaymentId);
    assert.ok(savedUpiTx, 'Transaction record must exist in DB');
    assert.strictEqual(savedUpiTx.amount, 50);
    assert.strictEqual(savedUpiTx.status, 'CAPTURED');
    assert.strictEqual(savedUpiTx.razorpay_order_id, rzpUpiOrderId);
  });

  // 4c. Dedicated UPI ₹50 Test with failure@razorpay
  await test('UPI Test: ₹50 Payment using failure@razorpay & Failure Logging', async () => {
    const upiFailOrderId = `FC-UPI-FAIL-${Date.now()}`;
    const createRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: upiFailOrderId,
        amount: 50,
        currency: 'INR',
        customer: { name: 'UPI Fail User', email: 'upifail@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(createRes.status, 201, 'UPI ₹50 fail order creation must succeed');
    const rzpUpiFailOrderId = createRes.data.data.razorpay_order_id;
    const failPaymentId = `pay_upi_fail_${Date.now()}`;

    const reportRes = await request('/api/payments/report-failure', {
      method: 'POST',
      body: {
        freshcart_order_id: upiFailOrderId,
        razorpay_order_id: rzpUpiFailOrderId,
        razorpay_payment_id: failPaymentId,
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Payment failed for test VPA failure@razorpay',
      },
    });

    assert.strictEqual(reportRes.status, 200, 'Failure reporting must succeed');
    assert.strictEqual(reportRes.data.order_status, 'FAILED');

    const failedTx = PaymentPersistenceService.getTransactionByPaymentId(failPaymentId);
    assert.ok(failedTx, 'Failed transaction record must exist in DB');
    assert.strictEqual(failedTx.amount, 50);
    assert.strictEqual(failedTx.status, 'FAILED');
    assert.strictEqual(failedTx.error_code, 'BAD_REQUEST_ERROR');
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

  // 5b. Rapid Duplicate Clicks on Unpaid Order (Fast Idempotency)
  await test('Scenario 6b: Fast Order Token Reuse on Repeated Pay Button Clicks', async () => {
    const rapidOrderId = `FC-RAPID-${Date.now()}`;
    const firstReq = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: rapidOrderId,
        amount: 350,
        currency: 'INR',
        customer: { name: 'Rapid Clicker', email: 'rapid@example.com', phone: '9811223344' },
      },
    });
    assert.strictEqual(firstReq.status, 201, 'First order creation must succeed with 201');
    const firstRzpId = firstReq.data.data.razorpay_order_id;

    // Simulate immediate second click with same order ID
    const secondReq = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: rapidOrderId,
        amount: 350,
        currency: 'INR',
        customer: { name: 'Rapid Clicker', email: 'rapid@example.com', phone: '9811223344' },
      },
    });
    assert.strictEqual(secondReq.status, 200, 'Repeated click must return 200 OK');
    assert.strictEqual(
      secondReq.data.data.razorpay_order_id,
      firstRzpId,
      'Must reuse active Razorpay Order ID to prevent duplicate order generation'
    );
  });

  // 5c. Stale Preloaded Order (Cart Details / Amount Changed)
  await test('Scenario 6c: Stale Preloaded Order Invalidation & Fresh Order Creation on Amount Change', async () => {
    const staleTestOrderId = `FC-STALE-${Date.now()}`;

    // Initial preloaded order with amount 400
    const initialOrder = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: staleTestOrderId,
        amount: 400,
        currency: 'INR',
        customer: { name: 'Cart Modifier', email: 'modifier@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(initialOrder.status, 201, 'Initial preloaded order creation should succeed');
    const initialRzpId = initialOrder.data.data.razorpay_order_id;
    assert.strictEqual(initialOrder.data.data.amount, 400);

    // Customer modifies cart/items: attempting to reuse same freshcart_order_id with different amount 750 must return 409 Conflict
    const conflictingOrder = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: staleTestOrderId,
        amount: 750,
        currency: 'INR',
        customer: { name: 'Cart Modifier', email: 'modifier@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(conflictingOrder.status, 409, 'Reusing same order ID with different amount must return 409 Conflict');
    assert.strictEqual(conflictingOrder.data.success, false);

    // Customer generates fresh order ID for the modified cart amount 750: succeeds cleanly
    const freshOrderId = `${staleTestOrderId}-v2`;
    const updatedOrder = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: freshOrderId,
        amount: 750,
        currency: 'INR',
        customer: { name: 'Cart Modifier', email: 'modifier@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(updatedOrder.status, 201, 'Fresh order for modified cart must return 201 Created');
    assert.notStrictEqual(
      updatedOrder.data.data.razorpay_order_id,
      initialRzpId,
      'Stale Razorpay order must NOT be reused when amount changes'
    );
    assert.strictEqual(updatedOrder.data.data.amount, 750, 'New order must reflect updated amount ₹750');
    assert.strictEqual(updatedOrder.data.data.amount_in_paise, 75000);

    // Verify initial DB order was NOT overwritten or corrupted
    const dbOrder = PaymentPersistenceService.getOrderByFreshCartId(staleTestOrderId);
    assert.ok(dbOrder, 'Initial order must exist in database');
    assert.strictEqual(dbOrder.amount, 400, 'Original database order amount must NOT be altered');
    assert.strictEqual(dbOrder.razorpay_order_id, initialRzpId);
  });

  // 5d. Preload Failure Recovery
  await test('Scenario 6d: Preload Failure Recovery (Safe Fallback after Failed Attempt)', async () => {
    const failRecoveryOrderId = `FC-FAIL-RECOVERY-${Date.now()}`;

    // Attempt invalid order (e.g. invalid amount 0)
    const invalidRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: failRecoveryOrderId,
        amount: 0,
        currency: 'INR',
        customer: { name: 'Retry User', email: 'retry@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(invalidRes.status, 400, 'Invalid preload attempt must return 400 Bad Request');

    // Subsequent valid user click creates order cleanly
    const validRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: failRecoveryOrderId,
        amount: 600,
        currency: 'INR',
        customer: { name: 'Retry User', email: 'retry@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(validRes.status, 201, 'Subsequent valid order request must succeed');
    assert.ok(validRes.data.data.razorpay_order_id, 'Valid Razorpay order must be returned');
  });

  // 5e. Concurrent Duplicate Order Requests (Identical Amounts and Currencies)
  await test('Scenario 6e: Concurrent Duplicate Order Requests Return Identical Razorpay Order (Identical Amounts & Currencies)', async () => {
    const concurrentOrderId = `FC-CONCURRENT-${Date.now()}`;

    // Fire 3 parallel requests simultaneously with identical amounts and currencies
    const [res1, res2, res3] = await Promise.all([
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: concurrentOrderId,
          amount: 500,
          currency: 'INR',
          customer: { name: 'Concurrent User', email: 'concurrent@example.com', phone: '9876543210' },
        },
      }),
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: concurrentOrderId,
          amount: 500,
          currency: 'INR',
          customer: { name: 'Concurrent User', email: 'concurrent@example.com', phone: '9876543210' },
        },
      }),
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: concurrentOrderId,
          amount: 500,
          currency: 'INR',
          customer: { name: 'Concurrent User', email: 'concurrent@example.com', phone: '9876543210' },
        },
      }),
    ]);

    // All should succeed (one creates with 201, others reuse with 200)
    assert.ok([200, 201].includes(res1.status), `Res 1 status must be 200 or 201, got ${res1.status}`);
    assert.ok([200, 201].includes(res2.status), `Res 2 status must be 200 or 201, got ${res2.status}`);
    assert.ok([200, 201].includes(res3.status), `Res 3 status must be 200 or 201, got ${res3.status}`);

    const id1 = res1.data.data.razorpay_order_id;
    const id2 = res2.data.data.razorpay_order_id;
    const id3 = res3.data.data.razorpay_order_id;

    assert.strictEqual(id1, id2, 'Concurrent requests must resolve to the identical Razorpay Order ID');
    assert.strictEqual(id2, id3, 'Concurrent requests must resolve to the identical Razorpay Order ID');

    // Verify database values match the returned values exactly
    const dbOrder = PaymentPersistenceService.getOrderByFreshCartId(concurrentOrderId);
    assert.ok(dbOrder, 'Database order must exist');
    assert.strictEqual(dbOrder.razorpay_order_id, id1, 'Database order ID must match returned Razorpay order ID');
    assert.strictEqual(dbOrder.amount, 500, 'Database amount must match returned amount');
    assert.strictEqual(dbOrder.amount_in_paise, 50000, 'Database paise must match returned paise');
    assert.strictEqual(dbOrder.currency, 'INR', 'Database currency must match returned currency');
  });

  // 5f. Simultaneous Requests With Different Amounts Conflict Protection (New and Existing Unpaid)
  await test('Scenario 6f: Simultaneous Requests With Different Amounts Reject Mismatch with 409 Conflict', async () => {
    // Sub-case 1: Simultaneous requests on a NEW order ID with different amounts
    const diffAmountOrderId = `FC-DIFF-${Date.now()}`;
    const [resA, resB] = await Promise.all([
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: diffAmountOrderId,
          amount: 400,
          currency: 'INR',
          customer: { name: 'Diff User A', email: 'userA@example.com', phone: '9876543210' },
        },
      }),
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: diffAmountOrderId,
          amount: 750,
          currency: 'INR',
          customer: { name: 'Diff User B', email: 'userB@example.com', phone: '9876543210' },
        },
      }),
    ]);

    const successRes = resA.status === 201 ? resA : resB;
    const conflictRes = resA.status === 409 ? resA : resB;

    assert.strictEqual(successRes.status, 201, 'One request must succeed with 201 Created');
    assert.strictEqual(conflictRes.status, 409, 'Concurrent request with different amount must be rejected with 409 Conflict');
    assert.strictEqual(conflictRes.data.success, false);
    assert.ok(
      conflictRes.data.error.includes('conflict') || conflictRes.data.error.includes('mismatch'),
      'Error message must describe the order amount conflict'
    );

    // Verify database amount strictly matches the successful request only
    const savedOrder = PaymentPersistenceService.getOrderByFreshCartId(diffAmountOrderId);
    assert.ok(savedOrder, 'Saved order must exist in DB');
    assert.strictEqual(savedOrder.amount, successRes.data.data.amount, 'Database amount must match successful request');
    assert.strictEqual(savedOrder.amount_in_paise, successRes.data.data.amount_in_paise);
    assert.strictEqual(savedOrder.razorpay_order_id, successRes.data.data.razorpay_order_id);

    // Sub-case 2: Simultaneous requests on an ALREADY EXISTING unpaid order with different amounts
    const existingUnpaidOrderId = `FC-EXISTING-UNPAID-${Date.now()}`;
    const initialCreate = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: existingUnpaidOrderId,
        amount: 300,
        currency: 'INR',
        customer: { name: 'Existing User', email: 'exist@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(initialCreate.status, 201);
    const existingRzpId = initialCreate.data.data.razorpay_order_id;

    // Fire 2 concurrent requests with different amounts (550 and 650) on this existing order
    const [concurrentA, concurrentB] = await Promise.all([
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: existingUnpaidOrderId,
          amount: 550,
          currency: 'INR',
          customer: { name: 'Existing User', email: 'exist@example.com', phone: '9876543210' },
        },
      }),
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: existingUnpaidOrderId,
          amount: 650,
          currency: 'INR',
          customer: { name: 'Existing User', email: 'exist@example.com', phone: '9876543210' },
        },
      }),
    ]);

    // BOTH concurrent conflicting requests must receive 409 Conflict (neither overwrites DB)
    assert.strictEqual(concurrentA.status, 409, 'Request A with conflicting amount must return 409');
    assert.strictEqual(concurrentB.status, 409, 'Request B with conflicting amount must return 409');

    // Verify existing database order remains completely unmodified
    const postOrder = PaymentPersistenceService.getOrderByFreshCartId(existingUnpaidOrderId);
    assert.ok(postOrder);
    assert.strictEqual(postOrder.amount, 300, 'Database amount must remain original ₹300');
    assert.strictEqual(postOrder.razorpay_order_id, existingRzpId, 'Razorpay order ID must remain original');
  });

  // 5h. Currency Validation & Unsupported Currency Request Rejection
  await test('Scenario 6h: Unsupported Currency Requests (USD) Rejected with 400 & Preserves Existing Order', async () => {
    // Sub-case 1: Simultaneous requests on a NEW order ID where one request specifies valid INR and the other specifies unsupported USD
    const diffCurrencyOrderId = `FC-DIFF-CURR-${Date.now()}`;
    const [resCurrA, resCurrB] = await Promise.all([
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: diffCurrencyOrderId,
          amount: 500,
          currency: 'INR',
          customer: { name: 'Currency User A', email: 'currA@example.com', phone: '9876543210' },
        },
      }),
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: diffCurrencyOrderId,
          amount: 500,
          currency: 'USD',
          customer: { name: 'Currency User B', email: 'currB@example.com', phone: '9876543210' },
        },
      }),
    ]);

    // Valid INR request succeeds with 201 Created
    assert.strictEqual(resCurrA.status, 201, 'Valid INR request must succeed with 201 Created');
    assert.strictEqual(resCurrA.data.data.currency, 'INR');
    const validRzpOrderId = resCurrA.data.data.razorpay_order_id;
    assert.ok(validRzpOrderId, 'Valid Razorpay order ID must be returned');

    // Unsupported USD request is rejected by schema validation with 400 Bad Request
    assert.strictEqual(resCurrB.status, 400, 'Unsupported currency request (USD) must be rejected with 400 Bad Request');
    assert.strictEqual(resCurrB.data.success, false);
    assert.ok(
      JSON.stringify(resCurrB.data).includes('Only INR currency is currently supported'),
      'Error message must state that only INR is supported'
    );

    // Verify database record strictly preserves the valid INR order
    const savedCurrOrder = PaymentPersistenceService.getOrderByFreshCartId(diffCurrencyOrderId);
    assert.ok(savedCurrOrder, 'Database order must exist');
    assert.strictEqual(savedCurrOrder.currency, 'INR', 'Database currency must remain INR');
    assert.strictEqual(savedCurrOrder.amount, 500, 'Database amount must remain 500');
    assert.strictEqual(savedCurrOrder.razorpay_order_id, validRzpOrderId, 'Database Razorpay order ID must match original INR order');

    // Sub-case 2: Sequential request with unsupported USD on an existing INR order
    const subsequentUsdAttempt = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: diffCurrencyOrderId,
        amount: 500,
        currency: 'USD',
        customer: { name: 'Currency User C', email: 'currC@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(subsequentUsdAttempt.status, 400, 'Subsequent USD request must be rejected with 400 Bad Request');

    // Verify database record remains completely unchanged
    const finalOrderCheck = PaymentPersistenceService.getOrderByFreshCartId(diffCurrencyOrderId);
    assert.ok(finalOrderCheck);
    assert.strictEqual(finalOrderCheck.currency, 'INR', 'Currency must remain INR');
    assert.strictEqual(finalOrderCheck.amount, 500, 'Amount must remain 500');
    assert.strictEqual(finalOrderCheck.razorpay_order_id, validRzpOrderId, 'Razorpay order ID must remain unchanged');
  });

  // 5g. Protection of Already-Paid and Authorized Orders Against Simultaneous Modification
  await test('Scenario 6g: Simultaneous Requests on Already-Paid and Authorized Orders Reject Modification', async () => {
    const paidOrderId = `FC-PAID-PROTECT-${Date.now()}`;

    // 1. Create order
    const createRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: paidOrderId,
        amount: 500,
        currency: 'INR',
        customer: { name: 'Paid User', email: 'paid@example.com', phone: '9876543210' },
      },
    });
    assert.strictEqual(createRes.status, 201);
    const rzpPaidOrderId = createRes.data.data.razorpay_order_id;

    // 2. Simulate payment completion & capture
    const paymentId = `pay_captured_${Date.now()}`;
    const sigText = `${rzpPaidOrderId}|${paymentId}`;
    const validSig = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(sigText)
      .digest('hex');

    const verifyRes = await request('/api/payments/verify', {
      method: 'POST',
      body: {
        freshcart_order_id: paidOrderId,
        razorpay_order_id: rzpPaidOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSig,
      },
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.data.status, 'CAPTURED');

    // 3. Fire simultaneous requests: one with identical amount (500) and one with different amount (999)
    const [sameAmtAttempt, diffAmtAttempt] = await Promise.all([
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: paidOrderId,
          amount: 500,
          currency: 'INR',
          customer: { name: 'Paid User', email: 'paid@example.com', phone: '9876543210' },
        },
      }),
      request('/api/orders/create', {
        method: 'POST',
        body: {
          freshcart_order_id: paidOrderId,
          amount: 999,
          currency: 'INR',
          customer: { name: 'Paid User', email: 'paid@example.com', phone: '9876543210' },
        },
      }),
    ]);

    // BOTH requests must return 409 Conflict
    assert.strictEqual(sameAmtAttempt.status, 409, 'Attempt to create captured order must return 409 Conflict');
    assert.strictEqual(diffAmtAttempt.status, 409, 'Attempt to modify captured order amount must return 409 Conflict');

    // 4. Verify database order was NOT altered
    const dbOrder = PaymentPersistenceService.getOrderByFreshCartId(paidOrderId);
    assert.ok(dbOrder);
    assert.strictEqual(dbOrder.status, 'CAPTURED', 'Status must remain CAPTURED');
    assert.strictEqual(dbOrder.amount, 500, 'Amount must remain original ₹500');
    assert.strictEqual(dbOrder.razorpay_order_id, rzpPaidOrderId, 'Razorpay order ID must remain original');
  });

  // 6. Payment Failure / Cancelled Checkout
  await test('Scenario 3 & 4: Failed Transaction & Cancelled Checkout Logging', async () => {
    const cancelOrderId = `FC-CANCEL-${Date.now()}`;
    const createRes = await request('/api/orders/create', {
      method: 'POST',
      body: {
        freshcart_order_id: cancelOrderId,
        amount: 450,
        currency: 'INR',
        customer: { name: 'User Cancelled', email: 'cancel@example.com', phone: '9811223344' },
      },
    });
    assert.strictEqual(createRes.status, 201, 'Order creation for cancel test must succeed');

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

