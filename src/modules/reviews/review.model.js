import mongoose from "mongoose";
import Product from "../products/product.model.js";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.post("save", async function () {
  const stats = await this.constructor.aggregate([
    { $match: { product: this.product } },
    {
      $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(this.product, {
      ratings: { avg: stats[0].avg, count: stats[0].count },
    });
  } else {
    await Product.findByIdAndUpdate(this.product, {
      ratings: { avg: 0, count: 0 },
    });
  }
});

reviewSchema.post("remove", async function () {
  const stats = await this.constructor.aggregate([
    { $match: { product: this.product } },
    {
      $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(this.product, {
      ratings: { avg: stats[0].avg, count: stats[0].count },
    });
  } else {
    await Product.findByIdAndUpdate(this.product, {
      ratings: { avg: 0, count: 0 },
    });
  }
});

export default mongoose.model("Review", reviewSchema);
