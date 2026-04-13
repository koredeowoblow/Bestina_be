import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import globalErrorHandler from "./middlewares/error.middleware.js";
import AppError from "./utils/AppError.js";
import authRoutes from "./modules/auth/auth.routes.js";
import paymentRoutes from "./modules/payments/payments.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import productRoutes from "./modules/products/products.routes.js";
import categoryRoutes from "./modules/categories/categories.routes.js";
import cartRoutes from "./modules/cart/cart.routes.js";
import orderRoutes from "./modules/orders/orders.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import uploadRoutes from "./modules/upload/upload.routes.js";
import returnsRoutes from "./modules/returns/returns.routes.js";
import checkoutRoutes from "./modules/checkout/checkout.routes.js";
import shippingRoutes from "./modules/shipping/shipping.routes.js";
import contentRoutes from "./modules/content/content.routes.js";
import { isRedisAvailable } from "./config/redis.config.js";
import hpp from "hpp";
const app = express();

// 1. GLOBAL MIDDLEWARES
app.use(helmet());
app.use(hpp());

const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  /\.onrender\.com$/, // Matches any subdomain on render.com
  "https://bestina.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const isAllowed = defaultOrigins.some((allowed) => {
        if (allowed instanceof RegExp) return allowed.test(origin);
        return allowed === origin;
      });

      if (
        isAllowed ||
        (process.env.CORS_ORIGIN &&
          process.env.CORS_ORIGIN.split(",").includes(origin))
      ) {
        callback(null, true);
      } else {
        callback(new AppError(`Not allowed by CORS: ${origin}`, 403));
      }
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

if (config.env === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: "Too many requests from this IP, please try again in 15 minutes!",
});
app.set("trust proxy", 1);
app.use("/api", limiter);

app.use(
  express.json({
    limit: "10kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(mongoSanitize());

// 2. ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/content", contentRoutes);

app.get("/api/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = isRedisAvailable() ? "connected" : "disconnected";

  const isHealthy = dbStatus === "connected" && redisStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy
      ? "API is fully operational"
      : "API is experiencing issues with upstream services",
    data: {
      database: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
    },
  });
});

// 3. UNHANDLED ROUTES
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4. GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

export default app;
