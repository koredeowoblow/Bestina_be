import productRepo from './product.repository.js';
import { getRedisClient, isRedisAvailable } from '../../config/redis.config.js';
import AppError from '../../utils/AppError.js';
import eventBus from '../../utils/eventBus.js';
const CACHE_PREFIX = 'products_';
const CACHE_TTL = 300; // 5 minutes

class ProductService {
  async getProducts(query, isAdmin = false) {
    let version = 'v1';
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      version = await redisClient.get('products_version') || 'v1';
    }

    // Generate cache key based on query params and global version
    const queryHash = Buffer.from(JSON.stringify(query)).toString('base64');
    const cacheKey = `${CACHE_PREFIX}${version}_${isAdmin ? 'admin_' : ''}${queryHash}`;

    // Try cache first
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
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
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL });
    }

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
    // O(1) invalidation: atomic increment of global version key seamlessly orphans all standing caches
    if (!isRedisAvailable()) return;
    const redisClient = await getRedisClient();
    await redisClient.incr('products_version');
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

  async reduceStockForOrder(orderItems) {
    if (!orderItems || orderItems.length === 0) return;
    const promises = orderItems.map(item => 
      productRepo.update(item.product._id || item.product, { $inc: { stock: -item.qty } })
    );
    await Promise.all(promises);
    await this.invalidateCache();
  }
}

const productService = new ProductService();

eventBus.on('order.paid', async (order) => {
  try {
    await productService.reduceStockForOrder(order.items);
  } catch (err) {
    console.error('Failed to dynamically reduce stock via EventBus:', err);
  }
});

export default productService;
