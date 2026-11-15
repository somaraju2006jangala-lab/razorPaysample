# Fresh-Cart Mobile Razorpay Integration Module

This directory contains integration assets, architecture documentation, and production adapters for embedding the Fresh-Cart Razorpay Payment Gateway into the **Fresh-Cart Android and iOS Mobile Applications** (built with React Native or Expo).

---

## 📱 Mobile Architecture Overview

A mobile payment integration differs fundamentally from web checkout:
- Mobile payments rely on the **official native Razorpay Mobile SDK** (`react-native-razorpay`), communicating over Android / iOS native bridges.
- Mobile UPI apps (Google Pay, PhonePe, Paytm, CRED, BHIM) require **UPI Intent** deep-link switching and intent filters in `AndroidManifest.xml`.
- **Never claim a responsive web view is equivalent to native checkout**. While the web template is touch-responsive, mobile apps should leverage `react-native-razorpay` with native fallback to prevent drop-offs during banking app switching.

---

## 📦 Directory Contents

- **`integration-guide.md`**: Complete step-by-step setup for Expo Development Builds, bare React Native, ProGuard rules, Android permissions, and deep-link schemes.
- **`FreshCartRazorpayAdapter.ts`**: Reusable TypeScript mobile client adapter that communicates with your Fresh-Cart payment backend endpoints (`/api/orders/create` and `/api/payments/verify`).
- **`FreshCartMobilePaymentScreen.tsx`**: Drop-in reference React Native screen demonstrating native checkout launch, loading indicators, and cryptographic verification.

---

## ⚡ Quick Mobile Flow

```
+--------------------------------------------------------------------+
| 1. Mobile App calls backend: POST /api/orders/create               |
|    -> Backend returns razorpay_order_id and public key_id          |
+--------------------------------------------------------------------+
                                  |
                                  v
+--------------------------------------------------------------------+
| 2. App invokes RazorpayCheckout.open(options) via Native SDK       |
|    -> User pays via UPI Intent app / Card / NetBanking             |
+--------------------------------------------------------------------+
                                  |
                                  v
+--------------------------------------------------------------------+
| 3. Native SDK returns payment_id, order_id, signature              |
+--------------------------------------------------------------------+
                                  |
                                  v
+--------------------------------------------------------------------+
| 4. App calls backend: POST /api/payments/verify                    |
|    -> Backend verifies HMAC-SHA256 signature against key_secret    |
|    -> Webhook verifies independently in parallel                   |
+--------------------------------------------------------------------+
                                  |
                                  v
+--------------------------------------------------------------------+
| 5. Display Verified Success / Failed Screen                        |
+--------------------------------------------------------------------+
```

