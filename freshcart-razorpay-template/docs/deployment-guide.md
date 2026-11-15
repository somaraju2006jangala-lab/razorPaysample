# Fresh-Cart Razorpay Gateway - Deployment Guide (Render + Vercel)

This guide walks you through deploying the **Backend to Render** and the **Frontend to Vercel**.

---

## Architecture Overview

```
+───────────────────────────+             +───────────────────────────+
│          VERCEL           │             │          RENDER           │
│    (Frontend Web App)     │             │     (Node.js Backend)     │
│                           │  REST /api  │                           │
│  React 19 + Vite + TS     │ ──────────► │  Express + Razorpay SDK   │
│  vercel.json SPA rewrite  │             │  SQLite Database          │
│                           │             │  HMAC SHA-256 Signatures  │
+───────────────────────────+             +───────────────────────────+
                                                        ▲
                                                        │ Webhooks
                                                        │ (x-razorpay-sig)
                                          +───────────────────────────+
                                          │     RAZORPAY GATEWAY      │
                                          │   Live / Test Dashboard   │
                                          +───────────────────────────+
```

---

## Step 1: Push Code to GitHub

Make sure your project is pushed to a GitHub repository:
```bash
git init
git add .
git commit -m "Fresh-Cart Razorpay Payment Gateway ready for deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/freshcart-razorpay-template.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Render (render.com)

1. Sign up or log into [Render](https://render.com).
2. Click **New +** → Select **Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:

| Field | Value | Notes |
|---|---|---|
| **Name** | `freshcart-razorpay-backend` | Or any unique name |
| **Language / Environment** | `Node` | |
| **Root Directory** | `freshcart-razorpay-template/backend` | **Important**: Set to the backend folder! |
| **Build Command** | `npm install && npm run build` | Compiles TypeScript |
| **Start Command** | `npm start` | Runs `node dist/server.js` |
| **Instance Type** | `Free` | |

5. Under **Environment Variables**, add the following:

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode |
| `PAYMENT_MODE` | `test` *(or `live`)* | Environment mode |
| `RAZORPAY_KEY_ID` | `rzp_test_...` | From Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | `your_key_secret` | From Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | `your_webhook_secret` | Set same secret in Razorpay |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your Vercel frontend URL |
| `ADMIN_SECRET_KEY` | `secure_random_string_2026` | For JWT signing |
| `ADMIN_USERNAME` | `admin` | Admin portal username |
| `ADMIN_PASSWORD` | `your_secure_password` | Admin portal password |
| `DATABASE_TYPE` | `sqlite` | (Or `postgres` if using Render Postgres) |
| `DATABASE_PATH` | `./data/freshcart_payments.db` | |

6. Click **Deploy Web Service**.
7. Once deployment finishes, Render will provide your public backend URL:
   `https://freshcart-razorpay-backend.onrender.com`

> **Verify backend health**: Open `https://freshcart-razorpay-backend.onrender.com/api/health` in your browser. It should return `{"status":"healthy"}`.

---

## Step 3: Deploy Frontend on Vercel (vercel.com)

1. Sign up or log into [Vercel](https://vercel.com).
2. Click **Add New...** → Select **Project**.
3. Import your GitHub repository.
4. Configure the project settings:

| Field | Value | Notes |
|---|---|---|
| **Framework Preset** | `Vite` | Auto-detected |
| **Root Directory** | `freshcart-razorpay-template/frontend` | Click **Edit** and choose frontend folder! |
| **Build Command** | `npm run build` | (Default) |
| **Output Directory** | `dist` | (Default) |

5. Under **Environment Variables**, add:

| Key | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://freshcart-razorpay-backend.onrender.com/api` | Your Render backend URL + `/api` |

6. Click **Deploy**.
7. Vercel will build and deploy your app, providing a URL like:
   `https://freshcart-razorpay-frontend.vercel.app`

---

## Step 4: Link Frontend URL in Render Backend

1. In your **Render Dashboard**, go to your backend web service.
2. Under **Environment**, update `FRONTEND_URL`:
   ```
   FRONTEND_URL = https://freshcart-razorpay-frontend.vercel.app
   ```
3. Click **Save Changes** (Render will automatically redeploy).

---

## Step 5: Configure Razorpay Webhooks (Optional for Async Sync)

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings** → **Webhooks**.
2. Click **Add New Webhook**.
3. **Webhook URL**:
   `https://freshcart-razorpay-backend.onrender.com/api/webhooks/razorpay`
4. **Secret**: Enter the exact same string you set in Render's `RAZORPAY_WEBHOOK_SECRET`.
5. **Active Events**: Check `payment.captured`, `payment.failed`, `refund.processed`.
6. Click **Save Webhook**.

---

## Summary of Files Prepared for Deployment

- **`freshcart-razorpay-template/frontend/vercel.json`**: Configures single-page-application (SPA) client-side routing rewrites for Vercel.
- **`freshcart-razorpay-template/frontend/src/services/api.ts`**: Dynamically reads `import.meta.env.VITE_API_BASE_URL` with `/api` fallback.
- **`freshcart-razorpay-template/backend/src/app.ts`**: CORS configured to accept any `*.vercel.app` domain and `FRONTEND_URL`.
- **`freshcart-razorpay-template/render.yaml`**: Infrastructure blueprint for Render.
