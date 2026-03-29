import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const isCloudinaryUrl = (value) =>
  typeof value === "string" && value.startsWith("https://res.cloudinary.com");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    dosageInfo: String,
    brand: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: { type: Number, required: true, min: 0, set: (v) => Math.round(v) },
    discountPrice: { type: Number, min: 0, set: (v) => Math.round(v) },
    images: [
      {
        url: {
          type: String,
          required: true,
          validate: {
            validator: isCloudinaryUrl,
            message: "Image URL must start with https://res.cloudinary.com",
          },
        },
        publicId: { type: String, required: true },
      },
    ],
    stock: { type: Number, required: true, min: 0, default: 0 },
    prescriptionRequired: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    ratings: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Compound and text indexes for faster searches
productSchema.index({ category: 1, price: 1 });
productSchema.index({ category: 1, brand: 1, price: -1 });
productSchema.index({ isArchived: 1, stock: 1 });
productSchema.index({ name: "text", brand: "text" });

// Add pagination plugin
productSchema.plugin(mongoosePaginate);

// Global transformation for JSON response to simplify images
productSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    if (ret.images && Array.isArray(ret.images)) {
      ret.images = ret.images.map((img) => img.url);
    }
    return ret;
  },
});

productSchema.set("toObject", { virtuals: true });

// Pre-save hook to ensure slug exists if not provided
productSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

export default mongoose.model("Product", productSchema);
