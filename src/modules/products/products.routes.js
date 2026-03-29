import express from 'express';
import productController from './product.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import productValidation from './product.validation.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
const router = express.Router();

// Public routes
router.get('/', validate(productValidation.query, 'query'), productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin routes
router.use(protect, restrictTo('admin', 'super_admin'));
router.post('/', validate(productValidation.create), productController.createProduct);
router.patch('/:id', validate(productValidation.update), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export default router;
