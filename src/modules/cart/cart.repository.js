import Cart from './cart.model.js';
class CartRepository {
  async getCartByUserId(userId) {
    return await Cart.findOne({ user: userId }).populate('items.product');
  }

  async createCart(userId) {
    return await Cart.create({ user: userId, items: [] });
  }

  async saveCart(cartDocument) {
    return await cartDocument.save();
  }

  async clearCart(userId) {
    return await Cart.findOneAndUpdate(
      { user: userId },
      { items: [], subtotal: 0, discountTotal: 0, total: 0 },
      { new: true }
    );
  }
}

export default new CartRepository();
