import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
const returnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const returnSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerName: { type: String },
    items: [returnItemSchema],
    reason: { type: String, required: true },
    message: { type: String },
    images: [{ url: String, publicId: String }],
    amount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["Refund", "Exchange", "store_credit"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "processing",
        "completed",
        "Pending",
        "Approved",
        "Rejected",
      ],
      default: "pending",
    },
    adminNotes: String,
  },
  { timestamps: true },
);

returnSchema.plugin(mongoosePaginate);

export default mongoose.model("Return", returnSchema);
