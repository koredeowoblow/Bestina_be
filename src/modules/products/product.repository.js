import Product from "./product.model.js";

export class ProductRepository {
  constructor({ ProductModel }) {
    if (!ProductModel) {
      throw new Error("ProductRepository requires ProductModel");
    }
    this.model = ProductModel;
  }

  async paginateProducts(filter, options = {}) {
    // Only apply for public queries where isArchived is explicitly strictly filtered out 
    if (filter && filter.isArchived === false) {
      options.select = options.select ? `${options.select} -createdBy -lowStockThreshold -__v` : '-createdBy -lowStockThreshold -__v';
    }
    return this.model.paginate(filter, options);
  }

  async findById(id) {
    return this.model.findById(id).select("-createdBy -lowStockThreshold -__v").populate("category", "name slug").lean();
  }

  async create(data, session = null) {
    return this.model.create([data], { session }).then(res => res[0]);
  }

  async update(id, data, session = null, extraFilter = {}) {
    const filter = { _id: id, ...extraFilter };
    return this.model.findOneAndUpdate(filter, data, {
      new: true,
      runValidators: true,
      session,
    });
  }

  async softDelete(id) {
    return this.model.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true },
    );
  }
}

// Temporary legacy export for modules not yet migrated to container wiring.
const productRepository = new ProductRepository({ ProductModel: Product });

export default productRepository;
