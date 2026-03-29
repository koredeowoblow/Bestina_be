import express from 'express';
import adminController from './admin.controller.js';
import orderController from '../orders/order.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = express.Router();

router.use(protect, restrictTo('admin', 'super_admin'));

router.get('/dashboard/stats', adminController.getStats);

router.get('/users', adminController.getUsers);
router.put('/users/:id/suspend', adminController.suspendUser);

router.get('/orders', orderController.getAdminOrders);
router.put('/orders/:id/status', orderController.updateOrderStatus);

router.put('/settings', adminController.updateSettings);

export default router;
