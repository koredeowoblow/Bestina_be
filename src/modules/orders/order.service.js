import mongoose from "mongoose";
import AppError from "../../utils/AppError.js";

const DEFAULT_DELIVERY_FEE = 10;
const VALID_ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

class OrderService {
  constructor({
    orderRepository,
    cartService,
    productService,
    appErrorClass = AppError,
    deliveryFee = DEFAULT_DELIVERY_FEE,
  }) {
    if (!orderRepository) {
      throw new Error("OrderService requires orderRepository");
    }
    if (!cartService) {
      throw new Error("OrderService requires cartService");
    }
    if (!productService) {
      throw new Error("OrderService requires productService");
    }

    this.orderRepository = orderRepository;
    this.cartService = cartService;
    this.productService = productService;
    this.AppError = appErrorClass;
    this.deliveryFee = deliveryFee;
  }

  async createOrder(userId, email, payload) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await this.cartService.getCart(userId);

      if (!cart || cart.items.length === 0) {
        throw new this.AppError("Your cart is empty", 400);
      }

      const { shippingAddress, paymentMethod } = payload;
      const deliveryFee = this.deliveryFee;

      const orderData = {
        user: userId,
        items: cart.items.map((i) => ({
          product: i.product._id,
          qty: i.qty,
          price: i.price,
        })),
        shippingAddress,
        paymentMethod,
        subtotal: cart.subtotal,
        discount: cart.discountTotal,
        deliveryFee,
        total: cart.total + deliveryFee,
      };

      const order = await this.orderRepository.create(orderData, session);

      // Atomic Stock Reduction
      await this.productService.reduceStockForOrder(cart.items, session);

      await session.commitTransaction();
      return { order };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getMyOrders(userId, query) {
    const filter = { user: userId };
    const options = {
      page: parseInt(query.page, 10) || 1,
      limit: parseInt(query.limit, 10) || 20,
      sort: { createdAt: -1 },
    };

    if (query.status) filter.orderStatus = query.status;

    return this.orderRepository.paginateOrders(filter, options);
  }

  async getOrderById(id, userId, role) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new this.AppError("Order not found", 404);

    // Check ownership if not admin
    if (
      role !== "admin" &&
      role !== "super_admin" &&
      order.user._id.toString() !== userId.toString()
    ) {
      throw new this.AppError(
        "You do not have permission to view this order",
        403,
      );
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
      populate: [
        { path: "user", select: "name email" },
        { path: "items.product", select: "name price images" },
      ],
    };

    return this.orderRepository.paginateOrders(filter, options);
  }

  async updateOrderStatus(id, status) {
    if (!VALID_ORDER_STATUSES.includes(status)) {
      throw new this.AppError("Invalid order status", 400);
    }
    const order = await this.orderRepository.updateStatus(id, status);
    if (!order) throw new this.AppError("Order not found", 404);
    return order;
  }

  async cancelOrder(id, userId, role) {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new this.AppError("Order not found", 404);

    // Check ownership if not admin
    if (
      role !== "admin" &&
      role !== "super_admin" &&
      order.user._id.toString() !== userId.toString()
    ) {
      throw new this.AppError(
        "You do not have permission to cancel this order",
        403,
      );
    }

    // Only allow cancellation of pending/processing orders
    if (order.orderStatus !== "pending" && order.orderStatus !== "processing") {
      throw new this.AppError(
        `Cannot cancel order with status: ${order.orderStatus}`,
        400,
      );
    }

    const cancelledOrder = await this.orderRepository.updateStatus(
      id,
      "cancelled",
    );
    return cancelledOrder;
  }
}

export default OrderService;
