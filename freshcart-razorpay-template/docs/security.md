# Fresh-Cart Razorpay Payment Gateway - Security Architecture

Security is the core architectural principle of this payment gateway template. This document outlines how sensitive credentials, cryptographic signatures, and customer data are protected.

---

## 1. Secret Key Isolation

> [!IMPORTANT]
> The **Razorpay Key Secret (`RAZORPAY_KEY_SECRET`)** must NEVER be included in frontend code, mobile application bundles, or repository source files.
> - The frontend and mobile apps receive **only** the public Key ID (`RAZORPAY_KEY_ID`).
> - All cryptographic operations, order creation, and refund authorizations occur exclusively on the Node.js backend.

---

## 2. Cryptographic Signature Verification (HMAC SHA-256)

A client-side frontend callback alone is never treated as proof of payment. When Razorpay Standard Checkout completes, it returns:
- `razorpay_order_id`
- `razorpay_payment_id`
- `razorpay_signature`

### Verification Algorithm
```ts
const text = `${razorpay_order_id}|${razorpay_payment_id}`;
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(text)
  .digest('hex');

// Timing-safe comparison to prevent timing attacks
const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature, 'utf8'),
  Buffer.from(razorpay_signature, 'utf8')
);
```

Using `crypto.timingSafeEqual` eliminates side-channel timing attacks that could otherwise be used to guess signature bytes.

---

## 3. Webhook Signature Verification with Raw Body

Webhooks guarantee asynchronous payment capture even if the user closes their browser immediately after payment.

Razorpay signs the **raw, unparsed body buffer** of the incoming HTTP request. Standard `express.json()` alters whitespace and JSON key ordering, causing signature validation to fail.

Our architecture captures `rawBody` during body-parsing:
```ts
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
```

The webhook controller compares the signature against `RAZORPAY_WEBHOOK_SECRET`:
$$\text{Expected Webhook Sig} = \text{HMAC-SHA256}(\text{req.rawBody}, \text{WEBHOOK\_SECRET})$$

---

## 4. Idempotency & Duplicate Payment Prevention

To prevent duplicate charges or double order processing:
1. **Order Creation Check**:
   If an order with `freshcart_order_id` already exists with status `CAPTURED` or `AUTHORIZED`, the backend rejects duplicate creation attempts with `HTTP 409 Conflict`.
2. **Transaction Persistence**:
   The unique constraint on `razorpay_payment_id` prevents duplicate records. Subsequent callbacks update existing records rather than inserting duplicates.
3. **Webhook Event De-duplication**:
   Razorpay assigns a unique `id` (e.g. `evt_...`) to each webhook. We check `isWebhookEventProcessed(eventId)` before execution.

---

## 5. PCI-DSS Compliance Boundaries

- **Zero Cardholder Data Storage**: Fresh-Cart servers never receive, process, or store credit/debit card numbers, CVVs, or card PINs.
- **Hosted Fields / Modal**: All payment instrument fields are collected directly in Razorpay's PCI-DSS Level 1 certified checkout iframe.
- **Tokens Only**: Only masked card network names (e.g., `visa`, `mastercard`) and bank codes are stored for display purposes.

---

## 6. Rate Limiting & Denial of Service Protection

- **General API**: 100 requests per 15 minutes.
- **Payment Creation & Verification**: 30 requests per 5 minutes per IP.
- **Admin Login**: 10 attempts per 15 minutes to prevent brute-force attacks.

---

## 7. Sanitized Error Handling

The centralized `errorHandler` ensures that runtime stack traces and database internal errors are never sent in API responses during production mode (`NODE_ENV=production`).

