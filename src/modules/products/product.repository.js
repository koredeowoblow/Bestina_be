import Product from './product.model.js';
class ProductRepository {
  async paginateProducts(filter, options) {
    // using paginate plugin on model
    return await Product.paginate(filter, options);
  }

  async findById(id) {
    return await Product.findById(id).populate('category', 'name slug').lean();
  }

  async create(data) {
    return await Product.create(data);
  }

  async update(id, data) {
    return await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async softDelete(id) {
    return await Product.findByIdAndUpdate(id, { isArchived: true }, { new: true });
  }
}

export default new ProductRepository();
