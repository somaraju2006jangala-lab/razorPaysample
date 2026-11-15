# Fresh-Cart Integration Guide (Website, Mobile & Admin Portal)

This guide documents how to integrate this standalone payment module into the existing Fresh-Cart applications at a later stage **without modifying any existing core application files today**.

---

## 1. Architectural Integration Principles

1. **Separation of Concerns**:
   The payment template acts as a dedicated **Payment Microservice / Module**. It is responsible for handling payment creation, collecting instruments securely via Razorpay, validating HMAC cryptographic signatures, and handling webhooks.
2. **Explicit Order Confirmation**:
   The payment module does **not** assume authorization to directly mutate the core Fresh-Cart inventory or delivery tables. Instead, it returns a **verified payment payload** to the Fresh-Cart integration adapter. The Fresh-Cart backend retains sole authority to transition order status from `AWAITING_PAYMENT` to `ORDER_CONFIRMED`.

---

## 2. Information Handshake Protocol

### What Fresh-Cart Sends to the Payment Module:
- `freshcart_order_id`: Unique order identifier from Fresh-Cart database.
- `customer_id`: Fresh-Cart customer identifier.
- `amount`: Final payable total in INR (calculated on Fresh-Cart backend).
- `currency`: Default `'INR'`.
- `customer`: `{ name, email, phone }`.
- `return_url`: Website redirect destination or mobile deep-link URL (`freshcart://payment-callback`).

### What the Payment Module Returns:
- `razorpay_payment_id`: Cryptographically verified transaction ID from Razorpay.
- `razorpay_order_id`: Razorpay Order ID.
- `freshcart_order_id`: Fresh-Cart Order ID.
- `amount`: Verified amount collected.
- `currency`: Currency collected (`'INR'`).
- `verified_payment_status`: `'CAPTURED'`, `'FAILED'`, or `'REFUNDED'`.
- `payment_timestamp`: ISO 8601 timestamp.

---

## 3. Integrating with the Fresh-Cart Website

### Step 1: Install or Mount Frontend Components
Copy or import the payment components from `frontend/src/pages/` or wrap the checkout routes:
```tsx
import { PaymentSelectionPage } from './payment-module/pages/PaymentSelectionPage';
import { SuccessPage } from './payment-module/pages/SuccessPage';

// In Fresh-Cart React Router:
<Route path="/checkout/payment" element={<PaymentSelectionPage />} />
<Route path="/checkout/success" element={<SuccessPage />} />
```

### Step 2: Connect Checkout Button to Payment API
```ts
import { PaymentApiService } from './payment-module/services/api';

async function handleProceedToPayment(cart: FreshCartCart) {
  const rzpOrder = await PaymentApiService.createOrder({
    freshcart_order_id: cart.orderId,
    total_payable: cart.grandTotal,
    currency: 'INR',
    customer: {
      name: user.fullName,
      email: user.email,
      phone: user.phoneNumber,
    },
    items: cart.items,
  });

  // Launch checkout modal
}
```

---

## 4. Integrating with Fresh-Cart Android Mobile App (React Native / Expo)

Use the dedicated adapter provided in `mobile-integration/FreshCartRazorpayAdapter.ts`:

```tsx
import { FreshCartRazorpayAdapter } from './payment-module/mobile-integration/FreshCartRazorpayAdapter';
import RazorpayCheckout from 'react-native-razorpay';

const adapter = new FreshCartRazorpayAdapter('https://payments.freshcart.com');

async function handleMobileCheckout(order: FreshCartOrder) {
  // 1. Get Razorpay Order Token
  const rzpOrder = await adapter.createPaymentOrder({
    freshcart_order_id: order.id,
    total_payable: order.totalAmount,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
    },
  });

  // 2. Open Native SDK
  const data = await RazorpayCheckout.open({
    key: rzpOrder.key_id,
    order_id: rzpOrder.razorpay_order_id,
    amount: rzpOrder.amount_in_paise,
    name: 'Fresh-Cart',
    currency: 'INR',
    theme: { color: '#00D084' },
  });

  // 3. Cryptographically Verify on Server
  const verifiedResult = await adapter.verifyPayment({
    freshcart_order_id: order.id,
    razorpay_order_id: data.razorpay_order_id,
    razorpay_payment_id: data.razorpay_payment_id,
    razorpay_signature: data.razorpay_signature,
  });

  // 4. Update Mobile UI
  if (verifiedResult.verified) {
    navigation.navigate('OrderSuccess', { orderId: order.id });
  }
}
```

---

## 5. Integrating with Fresh-Cart Admin Portal

The standalone Admin Dashboard (`/admin`) can either:
1. Run as a dedicated payment settlement tool for finance & operations teams.
2. Be embedded as an `iframe` or imported as a React module into the main Fresh-Cart Admin Panel.
3. Use the protected API `/api/admin/stats` and `/api/refunds/initiate` with Bearer token authentication.

---

## 6. Integration Checklist

- [ ] Ensure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are added to production environment secrets.
- [ ] Configure production Webhook endpoint in Razorpay Dashboard.
- [ ] Execute `database/schema/postgres.sql` if using PostgreSQL for the production payment persistence layer.
- [ ] Verify that order confirmation in Fresh-Cart inventory service triggers only upon receipt of verified `CAPTURED` status.

