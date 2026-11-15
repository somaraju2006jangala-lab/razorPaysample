import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController.js';
const router = Router();
// Endpoint for Razorpay Webhook notifications
router.post('/razorpay', WebhookController.handleWebhook);
export default router;
