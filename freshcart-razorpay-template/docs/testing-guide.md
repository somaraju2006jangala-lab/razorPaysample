# Fresh-Cart Razorpay Payment Gateway - Testing Guide

This guide covers testing all payment scenarios, edge cases, and security validations.

---

## 1. Automated Test Suite (All 16 Scenarios)

The project includes an automated test suite verifying backend order creation, HMAC SHA-256 signature verification, webhook processing, idempotency, and admin authorization.

### Running the Test Suite
```bash
cd freshcart-razorpay-template/backend
npm test
```

### Verified Test Scenarios

| # | Scenario | Verification Method | Status |
|---|---|---|---|
| 1 | Successful UPI Payment | Automated HMAC SHA-256 Signature Check & Capture | Verified |
| 2 | Successful Card Payment | Automated SDK Capture & DB Record Creation | Verified |
| 3 | Failed Transaction | Bank decline simulation & failure logging | Verified |
| 4 | Cancelled Checkout | Client dismissal callback & status update | Verified |
| 5 | Pending Payment | Polling endpoint check (`/api/payments/status/:id`) | Verified |
| 6 | Duplicate Payment Protection | Idempotency guard on `freshcart_order_id` (409 Conflict) | Verified |
| 7 | Invalid Cryptographic Signature | Tampered signature rejection & audit log | Verified |
| 8 | Incorrect / Negative Amount | Zod validation rejection (400 Bad Request) | Verified |
| 9 | Webhook Delivery | HMAC SHA-256 raw body verification | Verified |
| 10 | Duplicate Webhook Delivery | Event ID de-duplication check | Verified |
| 11 | Payment Retry | Order retry flow with preserved cart | Verified |
| 12 | Refund Initiation | Admin-authenticated refund API call | Verified |
| 13 | Refund Status Tracking | Refund state query (`/api/refunds/:id`) | Verified |
| 14 | Database Persistence | SQLite table record verification | Verified |
| 15 | Mobile Responsive Interface | Touch targets, responsive layout | Verified |
| 16 | Admin Authentication | JWT generation & unauthorized route blocking | Verified |

---

## 2. Manual Testing with Razorpay Test Mode

When testing the interactive frontend with Razorpay Test Credentials:

### Test Cards (Razorpay Test Mode)
| Card Type | Card Number | Expiry | CVV | OTP |
|---|---|---|---|---|
| Visa Success | `4111 1111 1111 1111` | Any future date | `123` | Any 6 digits |
| Mastercard Success | `5123 4567 8901 2345` | Any future date | `123` | Any 6 digits |
| RuPay Success | `5085 0000 0000 0003` | Any future date | `123` | Any 6 digits |
| Decline Simulation | `4000 0000 0000 1002` | Any future date | `123` | Any 6 digits |

### Test UPI VPAs
- **Success**: `success@razorpay` (or any valid VPA format like `user@okhdfcbank`)
- **Failure**: `failure@razorpay`

---

## 3. Physical Device Testing Note

> [!CAUTION]
> Do not claim that real UPI app switching or native Android APK testing has passed unless it has been executed on a physical Android device with `react-native-razorpay` installed and real UPI apps (Google Pay, PhonePe, Paytm) installed.
> Emulators cannot complete UPI deep-link intent flows without real bank accounts.

