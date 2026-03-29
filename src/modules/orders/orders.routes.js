import express from 'express';
import orderController from './order.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import orderValidation from './order.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = express.Router();

// Protected User Routes
router.use(protect);

router.post('/', validate(orderValidation.create), orderController.createOrder);
router.get('/me', orderController.getMyOrders);

// Ensure single ID fetching does not conflict with admin routes below
router.get('/:id', orderController.getOrderById);

// This setup requires Admin logic to be on a separate Router path 
// since we scaffolded `app.use('/api/admin', adminRoutes);`! 
// We will export the controller logic so `adminRoutes` can use it!

export default router;
