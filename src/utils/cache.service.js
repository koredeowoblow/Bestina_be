class CacheService {
  constructor({ isRedisAvailable, getRedisClient }) {
    if (!isRedisAvailable) {
      throw new Error("CacheService requires isRedisAvailable");
    }
    if (!getRedisClient) {
      throw new Error("CacheService requires getRedisClient");
    }

    this.isRedisAvailable = isRedisAvailable;
    this.getRedisClient = getRedisClient;
  }

  isAvailable() {
    return this.isRedisAvailable();
  }

  async get(key) {
    try {
      if (!this.isAvailable()) return null;
      const redisClient = await this.getRedisClient();
      if (!redisClient) return null;
      return await redisClient.get(key);
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key, value, options = null) {
    try {
      if (!this.isAvailable()) return;
      const redisClient = await this.getRedisClient();
      if (!redisClient) return;

      if (options) {
        await redisClient.set(key, value, options);
        return;
      }

      await redisClient.set(key, value);
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error.message);
    }
  }

  async increment(key) {
    try {
      if (!this.isAvailable()) return;
      const redisClient = await this.getRedisClient();
      if (!redisClient) return;
      await redisClient.incr(key);
    } catch (error) {
      console.warn(`Cache increment failed for key ${key}:`, error.message);
    }
  }
}

export default CacheService;
