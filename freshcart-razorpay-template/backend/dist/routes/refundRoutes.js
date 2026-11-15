import { Router } from 'express';
import { RefundController } from '../controllers/refundController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
const router = Router();
// Public: check refund status
router.get('/:refundId', RefundController.getRefundStatus);
// Protected: Admin-only refund initiation
router.post('/initiate', requireAdminAuth, RefundController.initiateRefund);
export default router;
