import dotenv from 'dotenv';
import path from 'path';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

const port = parseInt(process.env.PORT || '5001', 10);
const nodeEnv = process.env.NODE_ENV || 'development';
const paymentMode = (process.env.PAYMENT_MODE || 'test').toLowerCase() as 'test' | 'live';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_FreshCartDemoKey';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'FreshCartDemoSecret2026';
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'FreshCartDemoWebhookSecret2026';

const databasePath = process.env.DATABASE_PATH || './data/freshcart_payments.db';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const adminSecretKey = process.env.ADMIN_SECRET_KEY || 'freshcart_jwt_admin_secret_key_super_secure_2026';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin@freshcart2026';

// Check if credentials are placeholders or active test/live credentials
const isDummyKey = !razorpayKeyId || razorpayKeyId.includes('YourTestKey') || razorpayKeyId === 'rzp_test_FreshCartDemoKey';

// Initialize Razorpay SDK instance
export const razorpayInstance = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export const config = {
  port,
  nodeEnv,
  paymentMode,
  razorpay: {
    keyId: razorpayKeyId,
    keySecret: razorpayKeySecret,
    webhookSecret: razorpayWebhookSecret,
    isDummyKey,
  },
  database: {
    type: (process.env.DATABASE_TYPE || 'sqlite') as 'sqlite' | 'postgres',
    path: path.resolve(process.cwd(), databasePath),
    url: process.env.DATABASE_URL,
  },
  frontendUrl,
  admin: {
    secretKey: adminSecretKey,
    username: adminUsername,
    password: adminPassword,
  },
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'INR',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

