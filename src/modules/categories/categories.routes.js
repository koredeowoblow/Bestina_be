import express from 'express';
import categoryController from './category.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import categoryValidation from './category.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = express.Router();

// Public routes (Optional protect lookup omitted, controller handles missing req.user via fallback)
router.get('/', categoryController.getAllCategories);

// Admin routes
router.use(protect, restrictTo('admin', 'super_admin'));
router.post('/', validate(categoryValidation.create), categoryController.createCategory);
router.put('/:id', validate(categoryValidation.update), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;
