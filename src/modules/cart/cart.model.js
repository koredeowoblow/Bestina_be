import mongoose from 'mongoose';
const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true, min: 0 } // Snapshot of price at add
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema],
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { timestamps: true });

// Middleware to calculate totals on save
cartSchema.pre('save', function(next) {
  this.subtotal = Math.round(this.items.reduce((acc, item) => acc + (item.price * item.qty), 0));
  this.total = Math.round(this.subtotal - this.discountTotal);
  if (this.total < 0) this.total = 0;
  next();
});

export default mongoose.model('Cart', cartSchema);
