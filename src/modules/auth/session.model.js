import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String
  },
  ip: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index automatically removes expired sessions
  }
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
