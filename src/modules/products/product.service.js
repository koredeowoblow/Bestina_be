import productRepo from './product.repository.js';
import redisClient from '../../config/redis.config.js';
import AppError from '../../utils/AppError.js';
const CACHE_PREFIX = 'products_';
const CACHE_TTL = 300; // 5 minutes

class ProductService {
  async getProducts(query, isAdmin = false) {
    // Generate cache key based on query params
    const queryHash = Buffer.from(JSON.stringify(query)).toString('base64');
    const cacheKey = `${CACHE_PREFIX}${isAdmin ? 'admin_' : ''}${queryHash}`;

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build filter
    const filter = {};
    if (!isAdmin) {
      filter.isArchived = false;
    }
    if (query.category) filter.category = query.category;
    if (query.brand) filter.brand = query.brand;
    if (query.in_stock === true) filter.stock = { $gt: 0 };
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Build options
    const options = {
      page: parseInt(query.page, 10) || 1,
      limit: parseInt(query.limit, 10) || 20,
      populate: { path: 'category', select: 'name slug' },
      lean: true
    };

    if (query.sort) {
      options.sort = query.sort; // e.g. "price" or "-price"
    } else if (query.search) {
      options.sort = { score: { $meta: 'textScore' } };
    }

    const result = await productRepo.paginateProducts(filter, options);
    
    // Save to cache
    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL);

    return result;
  }

  async getProductById(id) {
    // Single product fetch (could be cached too, but let's stick to list cache as requested)
    const product = await productRepo.findById(id);
    if (!product || product.isArchived) {
      throw new AppError('Product not found', 404);
    }
    // TODO: Fetch related products based on category/brand if necessary
    return product;
  }

  async invalidateCache() {
    // Invalidate all keys starting with products_
    let cursor = '0';
    do {
      const res = await redisClient.scan(cursor, 'MATCH', `${CACHE_PREFIX}*`, 'COUNT', '100');
      cursor = res[0];
      const keys = res[1];
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } while (cursor !== '0');
  }

  async createProduct(data) {
    const product = await productRepo.create(data);
    await this.invalidateCache();
    return product;
  }

  async updateProduct(id, data) {
    const product = await productRepo.update(id, data);
    if (!product) throw new AppError('Product not found', 404);
    await this.invalidateCache();
    return product;
  }

  async deleteProduct(id) {
    const product = await productRepo.softDelete(id);
    if (!product) throw new AppError('Product not found', 404);
    await this.invalidateCache();
    return product;
  }
}

export default new ProductService();
