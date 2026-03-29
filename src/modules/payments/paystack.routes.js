import express from 'express';
import paystackController from './paystack.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
const router = express.Router();

router.post('/webhook', paystackController.webhook);

router.use(protect);
router.post('/initialize', paystackController.initialize);
router.post('/verify/:reference', paystackController.verify);

export default router;
