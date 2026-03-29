import express from 'express';
import returnController from './return.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = express.Router();

// Required auth for returns
router.use(protect);

router.post('/', returnController.createReturn);
router.get('/me', returnController.getMyReturns);

// Admin pathways internally nested in returns route scope
router.use(restrictTo('admin', 'super_admin'));
router.get('/', returnController.getAdminReturns);
router.post('/:id/process', returnController.processReturn);

export default router;
