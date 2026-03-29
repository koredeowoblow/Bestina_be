import dotenv from "dotenv";
dotenv.config();

export default {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  db: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/bestina_db",
  },
  redis: {
    url:
      process.env.REDIS_URL ||
      "redis://default:OTVrFjTrS4CtKIWJaYlOFpHVT7RauT43@redis-14362.c52.us-east-1-4.ec2.cloud.redislabs.com:14362",
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "very_secret_key",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  },
};
