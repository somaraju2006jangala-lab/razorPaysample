import { Router } from 'express';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import refundRoutes from './refundRoutes.js';
import adminRoutes from './adminRoutes.js';
const router = Router();
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/refunds', refundRoutes);
router.use('/admin', adminRoutes);
// Health check and mode diagnostics
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Fresh-Cart Razorpay Payment Gateway',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        payment_mode: process.env.PAYMENT_MODE || 'test',
    });
});
export default router;
