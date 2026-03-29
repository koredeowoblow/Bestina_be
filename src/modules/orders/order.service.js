import orderRepo from './order.repository.js';
import cartService from '../cart/cart.service.js';
import AppError from '../../utils/AppError.js';
class OrderService {
  async createOrder(userId, email, payload) {
    const cart = await cartService.getCart(userId);
    
    if (!cart || cart.items.length === 0) {
      throw new AppError('Your cart is empty', 400);
    }

    const { shippingAddress, paymentMethod } = payload;
    
    const deliveryFee = 10; // Simple flat fee for example

    const orderData = {
      user: userId,
      items: cart.items.map(i => ({
        product: i.product._id,
        qty: i.qty,
        price: i.price
      })),
      shippingAddress,
      paymentMethod,
      subtotal: cart.subtotal,
      discount: cart.discountTotal,
      deliveryFee,
      total: cart.total + deliveryFee
    };

    const order = await orderRepo.create(orderData);

    // Cart is NOT cleared until payment webhook succeeds, to prevent orphan failed orders clearing carts.
    // The payment initialization is now securely delegated to POST /api/payments/initialize

    return { order };
  }

  async getMyOrders(userId, query) {
    const filter = { user: userId };
    const options = {
      page: parseInt(query.page, 10) || 1,
      limit: parseInt(query.limit, 10) || 20,
      sort: { createdAt: -1 }
    };

    if (query.status) filter.orderStatus = query.status;

    return await orderRepo.paginateOrders(filter, options);
  }

  async getOrderById(id, userId, role) {
    const order = await orderRepo.findById(id);
    if (!order) throw new AppError('Order not found', 404);
    
    // Check ownership if not admin
    if (role !== 'admin' && role !== 'super_admin' && order.user._id.toString() !== userId.toString()) {
      throw new AppError('You do not have permission to view this order', 403);
    }

    return order;
  }

  async getAdminOrders(query) {
    const filter = {};
    if (query.status) filter.orderStatus = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    
    // date ranges
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
    }

    const options = {
      page: parseInt(query.page, 10) || 1,
      limit: parseInt(query.limit, 10) || 20,
      sort: { createdAt: -1 },
      populate: { path: 'user', select: 'name email' }
    };

    return await orderRepo.paginateOrders(filter, options);
  }

  async updateOrderStatus(id, status) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
       throw new AppError('Invalid order status', 400);
    }
    const order = await orderRepo.updateStatus(id, status);
    if (!order) throw new AppError('Order not found', 404);
    return order;
  }
}

export default new OrderService();
