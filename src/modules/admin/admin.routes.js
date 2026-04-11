import express from "express";
import adminController from "./admin.controller.js";
import { orderController } from "../../container.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";
import returnController from "../returns/return.controller.js";
const router = express.Router();

router.use(protect, restrictTo("admin", "super_admin"));

router.get("/dashboard/stats", adminController.getStats);

router.get("/returns", returnController.getAdminReturns);
router.post("/returns/:id/approve-refund", returnController.processReturn);
router.post("/returns/:id/approve-exchange", returnController.processReturn);
router.post("/returns/:id/reject", returnController.processReturn);

router.get("/users", adminController.getUsers);
router.put("/users/:id/suspend", adminController.suspendUser);

router.get("/orders", orderController.getAdminOrders);
router.put("/orders/:id/status", orderController.updateOrderStatus);

router.get("/settings", adminController.getSettings);
router.put("/settings", adminController.updateSettings);

router.get("/admin-users", adminController.getAdminUsers);
router.post("/admin-users/invite", adminController.inviteAdmin);

router.get("/inventory", adminController.getInventory);
router.get("/inventory/export", adminController.exportInventory);
router.post("/inventory/bulk-restock", adminController.bulkRestock);

export default router;
