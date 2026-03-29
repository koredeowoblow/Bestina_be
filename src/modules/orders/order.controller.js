import orderService from './order.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class OrderController {
  createOrder = asyncWrapper(async (req, res, next) => {
    const result = await orderService.createOrder(req.user.id, req.user.email, req.body);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: result
    });
  });

  getMyOrders = asyncWrapper(async (req, res, next) => {
    const result = await orderService.getMyOrders(req.user.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: result.docs,
      meta: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        totalPages: result.totalPages,
        page: result.page
      }
    });
  });

  getOrderById = asyncWrapper(async (req, res, next) => {
    const order = await orderService.getOrderById(req.params.id, req.user.id, req.user.role);
    res.status(200).json({
      success: true,
      message: 'Order details fetched successfully',
      data: order
    });
  });

  // Admin endpoints
  getAdminOrders = asyncWrapper(async (req, res, next) => {
    const result = await orderService.getAdminOrders(req.query);
    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: result.docs,
      meta: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        totalPages: result.totalPages,
        page: result.page
      }
    });
  });

  updateOrderStatus = asyncWrapper(async (req, res, next) => {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  });
}


export default new OrderController();
