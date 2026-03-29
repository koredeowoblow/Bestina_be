import cartService from './cart.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class CartController {
  getCart = asyncWrapper(async (req, res, next) => {
    const cart = await cartService.getCart(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cart
    });
  });

  addItem = asyncWrapper(async (req, res, next) => {
    const { productId, qty } = req.body;
    const cart = await cartService.addItem(req.user.id, productId, qty);
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  });

  updateItem = asyncWrapper(async (req, res, next) => {
    const { productId, qty } = req.body;
    const cart = await cartService.updateItemQty(req.user.id, productId, qty);
    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: cart
    });
  });

  removeItem = asyncWrapper(async (req, res, next) => {
    const { itemId } = req.params; // Using itemId as productId mappings in frontend
    const cart = await cartService.removeItem(req.user.id, itemId);
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  });

  clearCart = asyncWrapper(async (req, res, next) => {
    const cart = await cartService.clearCart(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  });
}


export default new CartController();
