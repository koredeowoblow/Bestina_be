import cartService from "./cart.service.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";

class CartController {
  getCart = asyncWrapper(async (req, res, next) => {
    const cart = await cartService.getCart(req.user.id);
    return sendSuccess(res, cart, "Cart retrieved successfully");
  });

  addItem = asyncWrapper(async (req, res, next) => {
    const { productId, qty } = req.body;
    const cart = await cartService.addItem(req.user.id, productId, qty);
    return sendSuccess(res, cart, "Item added to cart");
  });

  updateItem = asyncWrapper(async (req, res, next) => {
    const { productId, qty } = req.body;
    const cart = await cartService.updateItemQty(
      req.user.id,
      productId,
      qty,
    );
    return sendSuccess(res, cart, "Cart updated successfully");
  });

  removeItem = asyncWrapper(async (req, res, next) => {
    const { itemId } = req.params;
    const cart = await cartService.removeItem(req.user.id, itemId);
    return sendSuccess(res, cart, "Item removed from cart");
  });

  clearCart = asyncWrapper(async (req, res, next) => {
    const cart = await cartService.clearCart(req.user.id);
    return sendSuccess(res, cart, "Cart cleared successfully");
  });
}

export default new CartController();
