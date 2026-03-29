import Order from "./order.model.js";
class OrderRepository {
  async paginateOrders(filter, options) {
    const defaultOptions = {
      lean: true,
      ...options,
    };
    return await Order.paginate(filter, defaultOptions);
  }

  async findById(id) {
    return await Order.findById(id)
      .populate("user", "name email")
      .populate("items.product", "name price images")
      .lean();
  }

  async findByPaymentRef(ref) {
    return await Order.findOne({ paymentRef: ref });
  }

  async create(data) {
    return await Order.create(data);
  }

  async updateStatus(id, newStatus) {
    const order = await Order.findById(id);
    if (!order) return null;
    order.orderStatus = newStatus;
    return await order.save(); // Utilizing pre-save hook to update timeline
  }

  async updatePayment(id, status, ref = null) {
    const updatePayload = { paymentStatus: status };
    if (ref) updatePayload.paymentRef = ref;
    return await Order.findByIdAndUpdate(id, updatePayload, { new: true });
  }

  async recordPaymentStatus(id, paymentId, status, session = null) {
    return await Order.findByIdAndUpdate(
      id,
      {
        paymentStatus: status,
        $addToSet: { payments: paymentId },
      },
      { new: true, session },
    );
  }
}

export default new OrderRepository();
