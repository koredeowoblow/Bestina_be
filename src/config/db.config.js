import mongoose from "mongoose";
import "../env.js";
import dns from "node:dns";
import { logger } from "../utils/logger.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/mowdmin";

export const connectMongoDB = async () => {
  let retries = 5;
  while (retries > 0) {
    logger.info("Connecting to MongoDB...");
    try {
      await mongoose.connect(mongoUri, {
        dbName: process.env.MONGO_DB_NAME || "Bestina",
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE) || 20,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
      });
      logger.info("✅ MongoDB connection established successfully.");
      return;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      logger.error(`❌ MongoDB connection error:`, { error: error.message });
      retries -= 1;
      if (retries === 0) {
        throw error;
      }
      logger.warn(
        `Retrying MongoDB connection... (${5 - retries}/5) in 5 seconds...`
      );
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

export default mongoose;
