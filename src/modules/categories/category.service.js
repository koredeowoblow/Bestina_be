import categoryRepo from './category.repository.js';
import { getRedisClient, isRedisAvailable } from '../../config/redis.config.js';
import AppError from '../../utils/AppError.js';
const CACHE_KEY = 'categories_all';
const CACHE_TTL = 300; // 5 minutes

class CategoryService {
  async getAllCategories(isAdmin = false) {
    if (!isAdmin && isRedisAvailable()) {
      const redisClient = await getRedisClient();
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }

    const categories = isAdmin ? await categoryRepo.findAllAdmin() : await categoryRepo.findAll();
    
    if (!isAdmin && isRedisAvailable()) {
      const redisClient = await getRedisClient();
      await redisClient.set(CACHE_KEY, JSON.stringify(categories), { EX: CACHE_TTL });
    }
    
    return categories;
  }

  async invalidateCache() {
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      await redisClient.del(CACHE_KEY);
    }
  }

  async createCategory(data) {
    const category = await categoryRepo.create(data);
    await this.invalidateCache();
    return category;
  }

  async updateCategory(id, data) {
    const category = await categoryRepo.update(id, data);
    if (!category) throw new AppError('Category not found', 404);
    await this.invalidateCache();
    return category;
  }

  async deleteCategory(id) {
    const category = await categoryRepo.delete(id);
    if (!category) throw new AppError('Category not found', 404);
    await this.invalidateCache();
    return null;
  }
}

export default new CategoryService();
