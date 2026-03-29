import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1, set: v => Math.round(v) },
  price: { type: Number, required: true, min: 0, set: v => Math.round(v) }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  shippingAddress: addressSchema,
  paymentMethod: { type: String, enum: ['paystack', 'stripe'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  subtotal: { type: Number, required: true, set: v => Math.round(v) },
  discount: { type: Number, default: 0, set: v => Math.round(v) },
  deliveryFee: { type: Number, default: 0, set: v => Math.round(v) },
  total: { type: Number, required: true, set: v => Math.round(v) },
  timeline: {
    type: [{
      status: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    validate: [(val) => val.length <= 20, '{PATH} exceeds the limit of 20']
  }
}, { timestamps: true });

orderSchema.plugin(mongoosePaginate);

// Log timeline changes
orderSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('orderStatus')) {
    this.timeline.push({ status: this.orderStatus, timestamp: new Date() });
  }
  next();
});

export default mongoose.model('Order', orderSchema);
