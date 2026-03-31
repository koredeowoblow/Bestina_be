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

    const uploadPromise = cloudinary.uploader.upload(testDataUri, {
      folder: "bestina-startup-check",
      resource_type: "auto",
    });

    // Add timeout of 10 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Cloudinary upload probe timeout")),
        10000,
      ),
    );

    await Promise.race([uploadPromise, timeoutPromise]);
    logger.info("✅ Cloudinary Upload API access verified at startup");
  } catch (err) {
    const http_code = Number(err?.http_code) || 0;
    if (
      http_code === 403 ||
      (err?.name === "Error" && err?.message?.includes("forbidden"))
    ) {
      throw new Error(
        "❌ Cloudinary Upload API access FORBIDDEN (403). " +
          "Check Cloudinary dashboard: " +
          "1. Regenerate a new API key/secret if the current one is restricted/read-only. " +
          "2. Ensure Upload API permissions are enabled. " +
          "3. Verify account is not suspended/over-quota. " +
          "4. Update CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env and restart.",
      );
    }
    // For other errors like timeouts, log a warning but continue
    logger.warn("⚠️ Cloudinary probe warning (continuing anyway):", {
      error: err?.message || String(err),
      code: err?.http_code || "unknown",
    });
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
    // Connect to MongoDB (required)
    await connectMongoDB();

    // Initialize Redis in background (optional - doesn't block startup)
    initializeRedis().catch((err) => {
      logger.warn("⚠️ Redis initialization failed, continuing without Redis:", {
        error: err.message,
      });
    });

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
    let errorMsg = "Unknown error";
    let errorStack = "";

    if (error instanceof Error) {
      errorMsg = error.message || String(error);
      errorStack = error.stack || "";
    } else if (error && typeof error === "object" && error.message) {
      errorMsg = error.message;
    } else if (typeof error === "string") {
      errorMsg = error;
    } else {
      errorMsg = JSON.stringify(error, null, 2);
    }

    console.error("❌ STARTUP FAILED:", errorMsg);
    if (errorStack) console.error("STACK:", errorStack);
    logger.error(`Failed to start server: ${errorMsg}`, { stack: errorStack });
    process.exit(1);
  }
};

startServer();
