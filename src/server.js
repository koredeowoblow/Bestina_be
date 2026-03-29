import app from "./app.js";
import { connectMongoDB } from "./config/db.config.js";
import { initializeRedis } from "./config/redis.config.js";
import config from "./config/index.js";
import { logger } from "./utils/logger.js";
import { validateRequiredEnv } from "./config/validate-env.js";
import cloudinary from "./config/cloudinary.config.js";

validateRequiredEnv();

const probeCloudinaryUploadAccess = async () => {
  try {
    const testDataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z3S8AAAAASUVORK5CYII=";
    await cloudinary.uploader.upload(testDataUri, {
      folder: "bestina-startup-check",
      resource_type: "auto",
    });
    logger.info("✅ Cloudinary Upload API access verified at startup");
  } catch (err) {
    const http_code = Number(err?.http_code) || 500;
    if (http_code === 403) {
      throw new Error(
        "❌ Cloudinary Upload API access FORBIDDEN (403). " +
          "Check Cloudinary dashboard: " +
          "1. Regenerate a new API key/secret if the current one is restricted/read-only. " +
          "2. Ensure Upload API permissions are enabled. " +
          "3. Verify account is not suspended/over-quota. " +
          "4. Update CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env and restart.",
      );
    }
    throw err;
  }
};

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥", err);
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", {
    error: err.stack || err,
  });
  process.exit(1);
});

const startServer = async () => {
  try {
    await probeCloudinaryUploadAccess();
    // Parallel initialization for faster boot
    await Promise.all([connectMongoDB(), initializeRedis()]);

    const server = app.listen(config.port, () => {
      logger.info(`App running on port ${config.port} in ${config.env} mode`);
    });

    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED REJECTION! 💥 Shutting down...", {
        error: err.stack || err,
      });
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", { error: error.message });
    process.exit(1);
  }
};

startServer();
