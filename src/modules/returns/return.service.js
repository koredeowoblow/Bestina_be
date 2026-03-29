import Return from './return.model.js';
import Order from '../orders/order.model.js';
import AppError from '../../utils/AppError.js';
class ReturnService {
  async createRequest(userId, payload) {
    const { orderId, items, reason, type } = payload;
    
    // Validate order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new AppError('Order not found or does not belong to user', 404);
    }
    
    // Simplification: We assume items array structure matches order
    return await Return.create({
      user: userId,
      orderId,
      items,
      reason,
      type
    });
  }

  async getUserRequests(userId) {
    return await Return.find({ user: userId }).populate('orderId', 'total createdAt paymentStatus').populate('items.product', 'name').lean();
  }

  async getAdminRequests(query) {
    const filter = {};
    if (query.status) filter.status = query.status;
    
    const options = {
      page: parseInt(query.page, 10) || 1,
      limit: parseInt(query.limit, 10) || 20,
      populate: [
        { path: 'user', select: 'name email' },
        { path: 'orderId', select: 'total createdAt' }
      ]
    };

    return await Return.paginate(filter, options);
  }

  async processReturn(id, action, notes) {
    if (!['Approve', 'Reject'].includes(action)) {
      throw new AppError('Invalid action. Must be Approve or Reject', 400);
    }
    
    const status = action === 'Approve' ? 'Approved' : 'Rejected';
    
    const returnReq = await Return.findByIdAndUpdate(
      id, 
      { status, adminNotes: notes },
      { new: true }
    );
    
    if (!returnReq) throw new AppError('Return request not found', 404);
    return returnReq;
  }
}

export default new ReturnService();
