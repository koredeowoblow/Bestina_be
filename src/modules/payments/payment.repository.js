import Payment from './payment.model.js';

class PaymentRepository {
  async create(data, session = null) {
    const options = session ? { session } : {};
    const [payment] = await Payment.create([data], options);
    return payment;
  }

  async findByReferenceAndProvider(reference, provider, session = null) {
    const query = Payment.findOne({ reference, provider });
    if (session) query.session(session);
    return await query.exec();
  }

  async findById(id, session = null) {
    const query = Payment.findById(id);
    if (session) query.session(session);
    return await query.exec();
  }

  async updateStatus(id, updateData, session = null) {
    const options = { new: true };
    if (session) options.session = session;
    return await Payment.findByIdAndUpdate(id, updateData, options).exec();
  }
}

export default new PaymentRepository();
