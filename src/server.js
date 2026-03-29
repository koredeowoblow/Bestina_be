import app from './app.js';
import { connectMongoDB } from './config/db.config.js';
import { initializeRedis } from './config/redis.config.js';
import config from './config/index.js';
import { logger } from './utils/logger.js';

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥', err);
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', { error: err.stack || err });
  process.exit(1);
});

const startServer = async () => {
  try {
    // Parallel initialization for faster boot
    await Promise.all([
      connectMongoDB(),
      initializeRedis()
    ]);
    
    const server = app.listen(config.port, () => {
      logger.info(`App running on port ${config.port} in ${config.env} mode`);
    });

    process.on('unhandledRejection', err => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err.stack || err });
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', { error: error.message });
    process.exit(1);
  }
};

startServer();
