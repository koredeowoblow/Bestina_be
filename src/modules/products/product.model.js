import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  dosageInfo: String,
  brand: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, required: true }
  }],
  stock: { type: Number, required: true, min: 0, default: 0 },
  prescriptionRequired: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  ratings: {
    avg: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound and text indexes for faster searches
productSchema.index({ category: 1, price: 1 });
productSchema.index({ name: 'text', brand: 'text' });

// Add pagination plugin
productSchema.plugin(mongoosePaginate);

// Pre-save hook to ensure slug exists if not provided
productSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

export default mongoose.model('Product', productSchema);
