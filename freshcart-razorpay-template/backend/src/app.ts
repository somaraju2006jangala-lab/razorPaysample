import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { config } from './config/index.js';

export const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let frontend load Razorpay script
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or webhook dispatches)
      if (!origin) return callback(null, true);

      const allowedExactOrigins = [
        config.frontendUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];

      // Allow exact matches or any Vercel domain (*.vercel.app)
      const isAllowed =
        allowedExactOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin);

      if (isAllowed || config.nodeEnv === 'development') {
        callback(null, true);
      } else {
        callback(null, true); // Allow all web origins for easy deployment preview
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
    credentials: true,
  })
);

// Body Parsing with rawBody preservation for Webhook HMAC SHA-256 verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
app.use('/api', apiLimiter);

// Root Health Check for Render and Cloud Load Balancers
app.get(['/', '/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Fresh-Cart Razorpay Payment Gateway',
    mode: config.paymentMode,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

