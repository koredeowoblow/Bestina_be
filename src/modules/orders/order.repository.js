import Order from "./order.model.js";

export class OrderRepository {
  constructor({ OrderModel }) {
    if (!OrderModel) {
      throw new Error("OrderRepository requires OrderModel");
    }

    this.model = OrderModel;
  }

  async paginateOrders(filter, options) {
    const defaultOptions = {
      lean: true,
      ...options,
    };
    return this.model.paginate(filter, defaultOptions);
  }

  async findById(id) {
    return this.model
      .findById(id)
      .populate("user", "name email")
      .populate("items.product", "name price images")
      .lean();
  }

  async findByPaymentRef(ref) {
    return this.model.findOne({ paymentRef: ref });
  }

  async create(data, session = null) {
    return this.model.create([data], { session }).then(res => res[0]);
  }

  async updateStatus(id, newStatus) {
    const order = await this.model.findById(id);
    if (!order) return null;
    order.orderStatus = newStatus;
    return order.save();
  }

  async updatePayment(id, status, ref = null) {
    const updatePayload = { paymentStatus: status };
    if (ref) updatePayload.paymentRef = ref;
    return this.model.findByIdAndUpdate(id, updatePayload, { new: true });
  }

  async recordPaymentStatus(id, paymentId, status, session = null) {
    return this.model.findByIdAndUpdate(
      id,
      {
        paymentStatus: status,
        $addToSet: { payments: paymentId },
      },
      { new: true, session },
    );
  }
}

// Temporary legacy export for modules not yet migrated to container wiring.
const orderRepository = new OrderRepository({ OrderModel: Order });

export default orderRepository;
