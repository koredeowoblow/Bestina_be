import { createClient } from 'redis';
import '../env.js'; // Load environment variables first
import { logger } from '../utils/logger.js';

let redisClient = null;
let redisAvailable = false;

const initializeRedis = async () => {
    if (!redisClient) {
        try {
            // Parse REDIS_HOST in case it includes port
            const hostParts = (process.env.REDIS_HOST || 'localhost').split(':');
            const host = hostParts[0];
            const port = process.env.REDIS_PORT || hostParts[1] || 6379;
            
            const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${host}:${port}/${process.env.REDIS_DB || 0}`;
            
            logger.info(`Connecting to Redis: redis://:***@${host}:${port}/${process.env.REDIS_DB || 0}`);
            
            redisClient = createClient({
                url: redisUrl,
                socket: {
                    connectTimeout: 10000,
                    lazyConnect: true
                }
            });

            redisClient.on('error', (err) => {
                logger.error('Redis connection error:', { error: err.message });
                redisAvailable = false;
            });

            redisClient.on('connect', () => {
                logger.info('Connected to Redis successfully');
                redisAvailable = true;
            });

            redisClient.on('ready', () => {
                logger.info('Redis client ready');
                redisAvailable = true;
            });

            redisClient.on('end', () => {
                logger.warn('Redis connection closed');
                redisAvailable = false;
            });

            await redisClient.connect();
            redisAvailable = true;
        } catch (error) {
            logger.error('Failed to connect to Redis:', { error: error.message });
            logger.warn('⚠️ Redis unavailable - OTP functionality will use in-memory fallback');
            redisAvailable = false;
            redisClient = null;
        }
    }
    return redisClient;
};

const getRedisClient = async () => {
    if (!redisClient || !redisClient.isOpen) {
        await initializeRedis();
    }
    return redisClient;
};

const isRedisAvailable = () => redisAvailable;

export { getRedisClient, initializeRedis, isRedisAvailable };
