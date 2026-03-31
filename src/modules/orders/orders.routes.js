import express from "express";
import { orderController } from "../../container.js";
import validate from "../../middlewares/validate.middleware.js";
import orderValidation from "./order.validation.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";
import returnRoutes from "../returns/returns.routes.js";

const router = express.Router();

// Mount returns sub-router
router.use("/:orderId/returns", returnRoutes);

// Public Order Tracking
router.post("/track", orderController.trackOrder);

// Protected User Routes
router.use(protect);

router.get("/me/returns", orderController.getMyGlobalReturns);

router.post("/", validate(orderValidation.create), orderController.createOrder);
router.get("/me", orderController.getMyOrders);

// Ensure single ID fetching does not conflict with admin routes below
router.get("/:id", orderController.getOrderById);
router.get("/:id/tracking", orderController.getOrderTimeline);
router.post("/:id/cancel", orderController.cancelOrder);

// This setup requires Admin logic to be on a separate Router path
// since we scaffolded `app.use('/api/admin', adminRoutes);`!
// We will export the controller logic so `adminRoutes` can use it!

export default router;
