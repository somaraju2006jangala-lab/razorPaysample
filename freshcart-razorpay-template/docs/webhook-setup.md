# Fresh-Cart Razorpay Webhook Configuration Guide

Webhooks provide asynchronous server-to-server notifications from Razorpay to Fresh-Cart. They ensure orders are reliably marked paid even if a customer closes their browser or encounters network dropouts after paying.

---

## 1. Webhook Endpoint Specification

- **Method**: `POST`
- **URL**: `https://<your-domain>/api/webhooks/razorpay`
- **Header**: `x-razorpay-signature`
- **Payload Format**: `application/json`

---

## 2. Configuration in Razorpay Dashboard

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Settings** → **Webhooks**.
3. Click **Add New Webhook**.
4. Set the **Webhook URL**:
   `https://<your-freshcart-domain>/api/webhooks/razorpay`
5. Generate and enter a strong **Secret** (e.g. `freshcart_webhook_secret_2026`).
6. Set the same secret in `backend/.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=freshcart_webhook_secret_2026
   ```
7. Select the following **Active Events**:
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.processed`
   - `refund.failed`
8. Click **Save Webhook**.

---

## 3. Local Webhook Testing with Ngrok / Tunneling

During local development, your backend runs at `http://localhost:5000`, which external Razorpay servers cannot reach directly. Use a reverse tunnel like Ngrok or Cloudflare Tunnel:

```bash
# Expose port 5000
npx ngrok http 5000
```

Copy the generated public HTTPS URL (e.g., `https://abc1234.ngrok-free.app`) and configure:
`https://abc1234.ngrok-free.app/api/webhooks/razorpay` in the Razorpay Webhook settings.

---

## 4. Webhook Event Processing Lifecycle

```
Razorpay Event Triggered
          │
          ▼
   POST /api/webhooks/razorpay
          │
          ├─► 1. Capture Raw Body Buffer
          ├─► 2. Compute HMAC SHA-256 with RAZORPAY_WEBHOOK_SECRET
          ├─► 3. Compare with 'x-razorpay-signature'
          │       ├─► Invalid -> Respond 400 Bad Request & Log
          │       └─► Valid -> Proceed
          │
          ├─► 4. Idempotency Check: Has event_id been processed?
          │       ├─► Yes -> Respond 200 OK (Skip duplicate execution)
          │       └─► No -> Proceed
          │
          ├─► 5. Dispatch Event Handler:
          │       ├─ payment.captured -> Record CAPTURED status
          │       ├─ payment.failed   -> Record FAILED status
          │       └─ refund.processed -> Update REFUNDED status
          │
          └─► 6. Respond 200 OK to Razorpay
```

---

## 5. Idempotency & Retries

Razorpay automatically retries webhook delivery up to 24 hours if your endpoint responds with non-2xx status codes.
Our webhook handler:
- Stores every event ID in the `webhook_logs` table.
- Ignores duplicate event deliveries safely.
- Always returns `200 OK` promptly once signature verification passes.

