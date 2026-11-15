import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
const router = Router();
// Admin Authentication
router.post('/login', authLimiter, AdminController.login);
// Protected Admin Dashboards
router.get('/stats', requireAdminAuth, AdminController.getStats);
router.get('/webhooks', requireAdminAuth, AdminController.getWebhookLogs);
router.get('/audit-logs', requireAdminAuth, AdminController.getAuditLogs);
export default router;
