import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 }
}, { _id: false });

const returnSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  items: [returnItemSchema],
  reason: { type: String, required: true },
  type: { type: String, enum: ['Refund', 'Exchange'], required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  adminNotes: String
}, { timestamps: true });

returnSchema.plugin(mongoosePaginate);

export default mongoose.model('Return', returnSchema);
