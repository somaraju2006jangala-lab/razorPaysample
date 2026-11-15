# Fresh-Cart Razorpay Payment Gateway - Setup Guide

Welcome to the standalone Fresh-Cart Razorpay Payment Gateway Template. This project provides an independent, production-ready payment infrastructure ready to be integrated into the Fresh-Cart grocery platform.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+ (or pnpm / yarn)
- **Razorpay Account**: Free Razorpay standard test account ([dashboard.razorpay.com](https://dashboard.razorpay.com))

---

## 2. Project Directory Structure

```
freshcart-razorpay-template/
├── backend/               # Node.js + Express + TypeScript + SQLite/Postgres
│   ├── src/
│   │   ├── config/        # Environment and Razorpay SDK client
│   │   ├── controllers/   # Orders, Payments, Webhooks, Refunds, Admin
│   │   ├── database/      # SQLite engine and schema migrations
│   │   ├── middleware/    # Auth, Rate limiting, Error sanitization
│   │   ├── routes/        # Express route modules
│   │   ├── services/      # Razorpay SDK and persistence services
│   │   ├── utils/         # HMAC SHA-256 cryptographic utilities
│   │   └── server.ts      # Server bootstrap
│   ├── test/              # 16-scenario automated test suite
│   ├── .env               # Backend environment variables
│   └── package.json
├── frontend/              # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/    # Reusable payment cards & modals
│   │   ├── pages/         # 9 required payment flow pages + Admin
│   │   ├── layouts/       # Main layout with branding & mode indicator
│   │   ├── services/      # Backend API client
│   │   ├── hooks/         # Configurable order state
│   │   └── types/         # TypeScript interfaces
│   └── package.json
├── database/              # Schema & migrations for SQLite and PostgreSQL
│   ├── migrations/
│   └── schema/
├── mobile-integration/    # React Native / Expo adapter & Android guides
└── docs/                  # In-depth architectural documentation
```

---

## 3. Installation & Startup

### Step A: Backend Setup
```bash
# Navigate to backend directory
cd freshcart-razorpay-template/backend

# Install dependencies
npm install

# Copy environment template if needed
cp .env.example .env

# Run automated tests to verify environment
npm test

# Start backend server in development mode (watches for changes)
npm run dev
```

The backend server starts on **`http://localhost:5001`**.  
On first run, it automatically creates the SQLite database in `./data/freshcart_payments.db` and seeds realistic Fresh-Cart grocery demo transactions.

---

### Step B: Frontend Setup
In a new terminal window:
```bash
# Navigate to frontend directory
cd freshcart-razorpay-template/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend web application runs at **`http://localhost:5173`**.

---

## 4. Configuring Razorpay API Keys

To connect to your Razorpay Dashboard:
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Switch to **Test Mode** (toggle on the top right).
3. Navigate to **Account & Settings** → **API Keys** → **Generate Test Key**.
4. Copy the **Key ID** (`rzp_test_...`) and **Key Secret**.
5. Paste them in `freshcart-razorpay-template/backend/.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_YourKeyId
   RAZORPAY_KEY_SECRET=YourKeySecret
   RAZORPAY_WEBHOOK_SECRET=YourWebhookSecret
   PAYMENT_MODE=test
   ```
6. Restart the backend server (`npm run dev`).

---

## 5. Admin Dashboard Access

- **URL**: `http://localhost:5173/admin`
- **Default Username**: `admin`
- **Default Password**: `admin@freshcart2026`
*(Configurable via `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `backend/.env`)*

