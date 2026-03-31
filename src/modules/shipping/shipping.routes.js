import express from "express";
import shippingController from "./shipping.controller.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

export const shippingPublicRouter = express.Router();
export const adminShippingRouter = express.Router();

// Public
shippingPublicRouter.get("/", shippingController.getShippingZones);

// Admin
adminShippingRouter.use(protect, restrictTo("admin", "super_admin"));
adminShippingRouter.get("/", shippingController.getAllShippingZones);
adminShippingRouter.post("/", shippingController.createShippingZone);
adminShippingRouter.patch("/:id", shippingController.updateShippingZone);
adminShippingRouter.patch("/:id/toggle", shippingController.toggleShippingZone);
adminShippingRouter.delete("/:id", shippingController.deleteShippingZone);

const router = express.Router();
router.use("/", shippingPublicRouter);
router.use("/admin", adminShippingRouter);

export default router;
