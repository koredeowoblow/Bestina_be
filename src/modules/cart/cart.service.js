import cartRepo from './cart.repository.js';
import productRepo from '../products/product.repository.js';
import AppError from '../../utils/AppError.js';
import eventBus from '../../utils/eventBus.js';

class CartService {
  async getCart(userId) {
    let cart = await cartRepo.getCartByUserId(userId);
    if (!cart) {
      cart = await cartRepo.createCart(userId);
    }
    return cart;
  }

  async addItem(userId, productId, qty) {
    const product = await productRepo.findById(productId);
    if (!product || product.isArchived) {
      throw new AppError('Product not found or unavailable', 404);
    }
    if (product.stock < qty) {
      throw new AppError(`Only ${product.stock} items left in stock`, 400);
    }

    let cart = await cartRepo.getCartByUserId(userId);
    if (!cart) cart = await cartRepo.createCart(userId);

    const existingItemIndex = cart.items.findIndex(item => item.product._id.toString() === productId.toString());

    if (existingItemIndex > -1) {
      // Increment qty
      const newQty = cart.items[existingItemIndex].qty + qty;
      if (product.stock < newQty) {
         throw new AppError(`Only ${product.stock} items left in stock. You already have ${cart.items[existingItemIndex].qty} in your cart.`, 400);
      }
      cart.items[existingItemIndex].qty = newQty;
      cart.items[existingItemIndex].price = product.price; // Update to latest price
    } else {
      cart.items.push({
        product: productId,
        qty: qty,
        price: product.price
      });
    }

    await cartRepo.saveCart(cart);
    return await cartRepo.getCartByUserId(userId); // Re-fetch to populate product details
  }

  async updateItemQty(userId, productId, qty) {
    let cart = await cartRepo.getCartByUserId(userId);
    if (!cart) throw new AppError('Cart not found', 404);

    const existingItemIndex = cart.items.findIndex(item => item.product._id.toString() === productId.toString());
    if (existingItemIndex === -1) {
      throw new AppError('Item not in cart', 404);
    }

    const product = await productRepo.findById(productId);
    if (product.stock < qty) {
      throw new AppError(`Only ${product.stock} items left in stock`, 400);
    }

    cart.items[existingItemIndex].qty = qty;
    cart.items[existingItemIndex].price = product.price;

    await cartRepo.saveCart(cart);
    return await cartRepo.getCartByUserId(userId);
  }

  async removeItem(userId, productId) {
    let cart = await cartRepo.getCartByUserId(userId);
    if (!cart) throw new AppError('Cart not found', 404);

    cart.items = cart.items.filter(item => item.product._id.toString() !== productId.toString());
    
    await cartRepo.saveCart(cart);
    return await cartRepo.getCartByUserId(userId);
  }

  async clearCart(userId) {
    const cart = await cartRepo.clearCart(userId);
    return cart;
  }
}

const cartService = new CartService();

eventBus.on('order.paid', async (order) => {
  try {
    // order.user can be populated object or ObjectId
    const userId = order.user._id || order.user;
    await cartService.clearCart(userId);
  } catch (err) {
    console.error('Failed to clear cart via EventBus:', err);
  }
});

export default cartService;
