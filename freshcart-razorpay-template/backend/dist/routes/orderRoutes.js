import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { paymentLimiter } from '../middleware/rateLimitMiddleware.js';
const router = Router();
router.post('/create', paymentLimiter, OrderController.createOrder);
router.get('/:orderId', OrderController.getOrder);
export default router;
