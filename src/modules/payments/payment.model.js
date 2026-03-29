import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['paystack', 'stripe'],
    required: true
  },
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  failureReason: {
    type: String
  },
  paidAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  }
}, { timestamps: true });

// Compound index for provider/reference deduplication
paymentSchema.index({ provider: 1, reference: 1 }, { unique: true });

export default mongoose.model('Payment', paymentSchema);
