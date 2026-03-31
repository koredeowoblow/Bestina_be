import Product from "./product.model.js";

export class ProductRepository {
  constructor({ ProductModel }) {
    if (!ProductModel) {
      throw new Error("ProductRepository requires ProductModel");
    }
    this.model = ProductModel;
  }

  async paginateProducts(filter, options) {
    return this.model.paginate(filter, options);
  }

  async findById(id) {
    return this.model.findById(id).populate("category", "name slug").lean();
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
