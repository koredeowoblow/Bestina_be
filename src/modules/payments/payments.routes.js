import express from "express";
import paymentController from "./payment.controller.js";
import validate from "../../middlewares/validate.middleware.js";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  initializePaymentSchema,
  refundPaymentSchema,
} from "./payment.validation.js";

const router = express.Router();

// 1. Initialize Payment
router.post(
  "/initialize",
  protect,
  validate(initializePaymentSchema),
  paymentController.initialize,
);

// 2. Refund Payment
router.post(
  "/refund",
  protect,
  validate(refundPaymentSchema),
  paymentController.refund,
);

// 3. Webhook Endpoints
// Note: In a real app, Stripe webhook needs express.raw() body parser, not express.json()
router.post("/webhook/:provider", paymentController.webhook);

// 4. Verify Payment Manual Fallback
router.get("/:provider/verify/:ref", protect, paymentController.verify);

export default router;
