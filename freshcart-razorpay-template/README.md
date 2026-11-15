# Fresh-Cart Razorpay Payment Gateway Template

> Standalone, reusable, production-ready Razorpay payment gateway template built under the **Fresh-Cart** visual brand. Designed for seamless future integration into the Fresh-Cart Grocery Website, Android Mobile Application (React Native / Expo), and Admin Portal.

---

## 🌟 Key Features

- **Fresh-Cart Visual Identity**: Minimal, premium grocery-commerce styling with neon green primary accents (`#00D084` / `#00FF87`), clean typography, soft rounded cards, and responsive layout.
- **Complete Payment Page Suite (All 9 Required Pages)**:
  1. **Payment Landing Page**: Configurable order summary (FC-DEMO-1001), Razorpay branding, security badges, and Test/Live mode indicator.
  2. **Payment Selection Page**: Custom selectable cards for UPI (GPay, PhonePe, Paytm, BHIM), Cards (Visa, Mastercard, RuPay), Net Banking (50+ banks), and Wallets.
  3. **Razorpay Checkout Launch Page**: Seamless Standard Checkout trigger with prefill customer details and dev simulator controls.
  4. **Payment Processing Page**: Multi-step HMAC SHA-256 cryptographic signature verification animation and polling fallback.
  5. **Payment Success Page**: Verified receipt display, delivery scheduling confirmation, and printable receipt.
  6. **Payment Failed Page**: Clear reason code display, bank debit reassurance, and instant retry.
  7. **Payment Pending Page**: Processing indicator with live polling and check status trigger.
  8. **Transaction Details Page**: Comprehensive audit view of payments, signatures, and linked refunds.
  9. **Refund Status Page**: Real-time lookup and tracking for initiated and processed refunds.
- **Transaction History Page**: Search, filter by status (CAPTURED, FAILED, PENDING, REFUNDED), date range filters, and CSV export.
- **Admin Settlement Dashboard**: Protected by JWT authentication, metrics summary (Total Transactions, Volume, Refunds), transaction table, interactive refund modal, and live webhook logs inspector.
- **Backend Security & Cryptography**:
  - HMAC SHA-256 signature verification using `crypto.timingSafeEqual`.
  - Raw body buffer capture for Razorpay webhook signature verification.
  - Rate limiting with `express-rate-limit`.
  - Duplicate payment protection & webhook idempotency.
  - Zero sensitive card credential storage (PCI-DSS Level 1 compliant).
- **Persistence Architecture**:
  - SQLite zero-config engine with WAL mode for local development.
  - Production-ready PostgreSQL DDL schemas and migration scripts in `database/`.
- **Mobile Integration Package**:
  - Official native SDK guide (`react-native-razorpay`).
  - Android UPI intent filters and ProGuard rules.
  - Drop-in `FreshCartRazorpayAdapter.ts` and `FreshCartMobilePaymentScreen.tsx`.

---

## 🚀 Quick Start Commands

### 1. Backend Server
```bash
cd freshcart-razorpay-template/backend
npm install
npm test            # Run 16-scenario test suite
npm run dev         # Starts server on http://localhost:5001
```

### 2. Frontend Application
```bash
cd freshcart-razorpay-template/frontend
npm install
npm run dev         # Starts UI on http://localhost:5173
```

Visit **`http://localhost:5173`** to access the payment gateway.  
Visit **`http://localhost:5173/admin`** to log in to the Admin Dashboard (Credentials: `admin` / `admin@freshcart2026`).

---

## 🧪 Testing All 16 Scenarios

Run the automated test runner:
```bash
cd freshcart-razorpay-template/backend
npm test
```
Verifies UPI payments, Card payments, signature mismatches, duplicate payment rejection, cancelled checkouts, webhook delivery, duplicate webhooks, refund initiation, database persistence, and admin authentication.

---

## 📚 Architectural Documentation

- **[Setup Guide](docs/setup.md)**: Detailed step-by-step setup and credential configuration.
- **[API Documentation](docs/api-documentation.md)**: Full REST API endpoint reference and payloads.
- **[Security Architecture](docs/security.md)**: HMAC SHA-256 validation, timing attack prevention, and rate limits.
- **[Webhook Configuration](docs/webhook-setup.md)**: Razorpay dashboard setup and raw body verification.
- **[Testing Guide](docs/testing-guide.md)**: Detailed testing instructions for all 16 scenarios.
- **[Fresh-Cart Integration Guide](docs/freshcart-integration-guide.md)**: Future integration into Website, Expo Mobile, and Admin.
- **[Mobile Integration](mobile-integration/README.md)**: Android permissions, UPI Intent, and native SDK adapters.

