# Fresh-Cart Razorpay Payment Gateway - API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Orders API

### `POST /orders/create`
Generates a new Razorpay order, records it in the persistence layer, and returns the public Key ID and Razorpay Order ID.

**Rate Limit**: 30 requests / 5 minutes  
**Request Body**:
```json
{
  "freshcart_order_id": "FC-DEMO-1001",
  "amount": 990.00,
  "currency": "INR",
  "customer": {
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "phone": "9876543210"
  },
  "items": [
    { "name": "Organic Alphonso Mangoes", "qty": 1, "price": 650 }
  ],
  "notes": {
    "delivery_slot": "Morning 7:00 AM"
  }
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "key_id": "rzp_test_FreshCartDemoKey",
    "razorpay_order_id": "order_OG78hKjDsw90",
    "freshcart_order_id": "FC-DEMO-1001",
    "amount": 990,
    "amount_in_paise": 99000,
    "currency": "INR",
    "customer": { ... },
    "payment_mode": "test",
    "is_simulated": false
  }
}
```

> [!WARNING]
> The backend **never** returns `RAZORPAY_KEY_SECRET`. Only `key_id` is sent to client applications.

---

### `GET /orders/:orderId`
Fetches the current registration and status of an order by Fresh-Cart Order ID or Razorpay Order ID.

---

## 2. Payments API

### `POST /payments/verify`
Cryptographically verifies the HMAC SHA-256 signature returned by Razorpay Checkout.

**Request Body**:
```json
{
  "freshcart_order_id": "FC-DEMO-1001",
  "razorpay_order_id": "order_OG78hKjDsw90",
  "razorpay_payment_id": "pay_OG78hKjDsw90",
  "razorpay_signature": "4a7bc9e12f00a35db49c762e..."
}
```

**Signature Verification Logic**:
$$\text{Expected Signature} = \text{HMAC-SHA256}(\text{order\_id} \parallel \text{"|"} \parallel \text{payment\_id}, \text{KEY\_SECRET})$$

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment verified and captured successfully",
  "data": {
    "verified": true,
    "status": "CAPTURED",
    "transaction_id": "f8a9e034-7221-4ba2-a89a-05186b8b0933",
    "razorpay_payment_id": "pay_OG78hKjDsw90",
    "razorpay_order_id": "order_OG78hKjDsw90",
    "freshcart_order_id": "FC-DEMO-1001",
    "amount": 990.00,
    "currency": "INR",
    "method": "upi",
    "timestamp": "2026-11-15T15:30:00.000Z"
  }
}
```

**Response (400 Bad Request)**:
```json
{
  "success": false,
  "error": "Payment verification failed: Invalid cryptographic signature.",
  "status": "FAILED"
}
```

---

### `POST /payments/report-failure`
Records client-side dismissal or gateway declines for accurate audit tracking.

---

### `GET /payments/status/:identifier`
Polls the verified state of a payment using Fresh-Cart Order ID or Payment ID.

---

### `GET /payments/transaction/:id`
Retrieves detailed breakdown of a single transaction, including linked refunds and customer info.

---

### `GET /payments/history`
Query parameters:
- `status`: ALL, CAPTURED, FAILED, PENDING, REFUNDED
- `search`: Searches across order ID, payment ID, customer name
- `startDate` & `endDate`: Filter by ISO date strings
- `limit` (default 50) & `offset` (default 0)

---

## 3. Webhook API

### `POST /webhooks/razorpay`
Asynchronous notification endpoint called by Razorpay servers.

**Headers required**:
- `x-razorpay-signature`: HMAC-SHA256 signature generated over the raw request payload using `RAZORPAY_WEBHOOK_SECRET`.

**Supported Events**:
- `payment.captured`: Confirms transaction capture independently of frontend.
- `payment.failed`: Records failure reason from bank.
- `refund.processed`: Confirms settlement of funds back to customer.
- `refund.failed`: Notifies when refund failed at recipient bank.

---

## 4. Refunds API

### `POST /refunds/initiate`
*(Requires Admin Bearer Token)*

**Request Body**:
```json
{
  "payment_id": "pay_OG78hKjDsw90",
  "amount": 990.00,
  "reason": "Customer cancelled before delivery dispatch",
  "speed": "optimum"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "id": "ref_93bca981-...",
    "razorpay_refund_id": "rfnd_OG78hKjDsw90",
    "razorpay_payment_id": "pay_OG78hKjDsw90",
    "amount": 990.00,
    "status": "PROCESSED",
    "speed": "optimum"
  }
}
```

---

### `GET /refunds/:refundId`
Public tracking endpoint for checking status of any refund by its `rfnd_...` identifier.

---

## 5. Admin Portal API

- `POST /admin/login`: Authenticates administrator and returns 8-hour JWT.
- `GET /admin/stats`: Aggregates total transactions, total volume, pending, and total refunds.
- `GET /admin/webhooks`: Lists raw incoming webhook events for inspection.
- `GET /admin/audit-logs`: Lists admin actions (e.g. refunds initiated).

