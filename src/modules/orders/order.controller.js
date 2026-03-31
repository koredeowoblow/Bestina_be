import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";
import Order from "./order.model.js";
import Return from "../returns/return.model.js";
import AppError from "../../utils/AppError.js";

class OrderController {
  constructor({ orderService }) {
    if (!orderService) {
      throw new Error("OrderController requires orderService");
    }

    this.orderService = orderService;
    this.createOrder = asyncWrapper(this.createOrder.bind(this));
    this.getMyOrders = asyncWrapper(this.getMyOrders.bind(this));
    this.getOrderById = asyncWrapper(this.getOrderById.bind(this));
    this.getAdminOrders = asyncWrapper(this.getAdminOrders.bind(this));
    this.updateOrderStatus = asyncWrapper(this.updateOrderStatus.bind(this));
    this.trackOrder = asyncWrapper(this.trackOrder.bind(this));
    this.getMyGlobalReturns = asyncWrapper(this.getMyGlobalReturns.bind(this));
    this.cancelOrder = asyncWrapper(this.cancelOrder.bind(this));
    this.getOrderTimeline = asyncWrapper(this.getOrderTimeline.bind(this));
  }

  async createOrder(req, res, next) {
    const createdOrder = await this.orderService.createOrder(
      req.user.id,
      req.user.email,
      req.body,
    );
    return sendSuccess(res, createdOrder, "Order created successfully", 201);
  }

  async getMyOrders(req, res, next) {
    const myOrdersResult = await this.orderService.getMyOrders(
      req.user.id,
      req.query,
    );
    const ordersMeta = {
      totalDocs: myOrdersResult.totalDocs,
      limit: myOrdersResult.limit,
      totalPages: myOrdersResult.totalPages,
      page: myOrdersResult.page,
    };

    return sendSuccess(
      res,
      myOrdersResult.docs,
      "Orders fetched successfully",
      200,
      ordersMeta,
    );
  }

  async getOrderById(req, res, next) {
    const order = await this.orderService.getOrderById(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return sendSuccess(res, order, "Order details fetched successfully");
  }

  async getAdminOrders(req, res, next) {
    const adminOrdersResult = await this.orderService.getAdminOrders(req.query);
    const ordersMeta = {
      totalDocs: adminOrdersResult.totalDocs,
      limit: adminOrdersResult.limit,
      totalPages: adminOrdersResult.totalPages,
      page: adminOrdersResult.page,
    };

    return sendSuccess(
      res,
      adminOrdersResult.docs,
      "Orders fetched successfully",
      200,
      ordersMeta,
    );
  }

  async updateOrderStatus(req, res, next) {
    const order = await this.orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
    );
    return sendSuccess(res, order, "Order status updated");
  }

  async trackOrder(req, res, next) {
    const { orderId, email } = req.body;
    if (!orderId || !email)
      throw new AppError("Order ID and email are required for tracking", 400);

    const order = await Order.findById(orderId).populate("user", "email");
    if (!order) throw new AppError("Order not found or email mismatch", 404);

    const orderEmail = order.user?.email || "";
    // Note: If guest checkout exists, email might be in shippingAddress. We check both.
    const shippingEmail = order.shippingAddress?.email || "";

    if (email !== orderEmail && email !== shippingEmail) {
      throw new AppError("Order not found or email mismatch", 404);
    }

    const publicOrder = {
      id: order._id,
      status: order.orderStatus,
      items: order.items,
      total: order.total,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      deliveryFee: order.deliveryFee,
      timeline: order.timeline,
    };

    return sendSuccess(res, publicOrder, "Order tracked successfully");
  }

  async getMyGlobalReturns(req, res, next) {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const returns = await Return.paginate(
      { user: req.user.id },
      {
        page,
        limit,
        populate: { path: "orderId", select: "orderStatus createdAt" },
        sort: "-createdAt",
      },
    );

    return sendSuccess(res, returns.docs, "Returns fetched successfully", 200, {
      totalDocs: returns.totalDocs,
      limit: returns.limit,
      totalPages: returns.totalPages,
      page: returns.page,
    });
  }

  async cancelOrder(req, res, next) {
    const cancelledOrder = await this.orderService.cancelOrder(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return sendSuccess(res, cancelledOrder, "Order cancelled successfully");
  }

  async getOrderTimeline(req, res, next) {
    const order = await this.orderService.getOrderById(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return sendSuccess(
      res,
      { timeline: order.timeline },
      "Order timeline fetched successfully",
    );
  }
}

export default OrderController;
