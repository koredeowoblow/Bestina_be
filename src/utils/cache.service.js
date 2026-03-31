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
    if (!this.isAvailable()) return null;
    const redisClient = await this.getRedisClient();
    return redisClient.get(key);
  }

  async set(key, value, options = null) {
    if (!this.isAvailable()) return;
    const redisClient = await this.getRedisClient();

    if (options) {
      await redisClient.set(key, value, options);
      return;
    }

    await redisClient.set(key, value);
  }

  async increment(key) {
    if (!this.isAvailable()) return;
    const redisClient = await this.getRedisClient();
    await redisClient.incr(key);
  }
}

export default CacheService;
