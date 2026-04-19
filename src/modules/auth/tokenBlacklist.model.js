import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export default mongoose.model("TokenBlacklist", tokenBlacklistSchema);
