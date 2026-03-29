import express from 'express';
import stripeController from './stripe.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
const router = express.Router();

// Stripe uses raw body for webhook verification, but express.json handles it if configured right, 
// or we might need express.raw(). For this scale, we pass the body.
router.post('/webhook', express.raw({type: 'application/json'}), stripeController.handleWebhook);

router.use(protect);
router.post('/create-intent', stripeController.createIntent);

export default router;
