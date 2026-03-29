import Category from './category.model.js';
class CategoryRepository {
  async findAll() {
    return await Category.find({ isActive: true }).lean();
  }

  async findAllAdmin() {
    return await Category.find().lean();
  }

  async findById(id) {
    return await Category.findById(id).lean();
  }

  async create(data) {
    return await Category.create(data);
  }

  async update(id, data) {
    return await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Category.findByIdAndDelete(id);
  }
}

export default new CategoryRepository();
