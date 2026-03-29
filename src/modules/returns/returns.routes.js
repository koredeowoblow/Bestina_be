import express from 'express';
import returnController from './return.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { createReturnSchema, evaluateReturnSchema } from './return.validation.js';
import validate from '../../middlewares/validate.middleware.js';

// enable mergeParams to absorb orderId from parent
const router = express.Router({ mergeParams: true });

// User endpoints
router.post('/', protect, validate(createReturnSchema), returnController.createReturn);
router.get('/me', protect, returnController.getMyReturns);

// Admin pathways internally nested in returns route scope
router.use(protect, restrictTo('admin', 'super_admin'));
router.get('/', returnController.getAdminReturns);

export default router;
