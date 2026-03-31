import mongoose from "mongoose";

const contentBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["home", "footer", "shipping-faqs"],
      required: true,
      unique: true,
    },
    data: { type: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("ContentBlock", contentBlockSchema);
