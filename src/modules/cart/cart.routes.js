import express from 'express';
import cartController from './cart.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import cartValidation from './cart.validation.js';
import { protect } from '../../middlewares/auth.middleware.js';
const router = express.Router();

router.use(protect); // All cart routes require auth

router.get('/', cartController.getCart);
router.post('/add', validate(cartValidation.addItem), cartController.addItem);
router.put('/update', validate(cartValidation.updateItem), cartController.updateItem);
router.delete('/remove/:itemId', cartController.removeItem);
router.delete('/clear', cartController.clearCart);

export default router;
