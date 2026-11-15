import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { paymentLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.post('/verify', paymentLimiter, PaymentController.verifyPayment);
router.post('/report-failure', PaymentController.reportFailure);
router.get('/status/:identifier', PaymentController.getPaymentStatus);
router.get('/transaction/:id', PaymentController.getTransactionDetails);
router.get('/history', PaymentController.listTransactions);

export default router;

