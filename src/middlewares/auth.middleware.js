import jwt from "jsonwebtoken";
import crypto from "crypto";
import { promisify } from "util";
import config from "../config/index.js";
import AppError from "../utils/AppError.js";
import asyncWrapper from "../utils/asyncWrapper.js";
import { getRedisClient, isRedisAvailable } from "../config/redis.config.js";
import TokenBlacklist from "../modules/auth/tokenBlacklist.model.js";
import User from "../modules/auth/auth.model.js";
// Note: Requires User model to be implemented.
// We will import it here, assuming auth module provides it.

const normalizeEnvKey = (envValue) => {
  if (!envValue || typeof envValue !== "string") return "";
  return envValue.replace(/\\n/g, "\n").trim();
};

const isPemKey = (keyValue, keyType) => {
  if (!keyValue) return false;
  return keyValue.includes(`-----BEGIN ${keyType} KEY-----`);
};

const publicKey = normalizeEnvKey(process.env.JWT_PUBLIC_KEY);
const privateKey = normalizeEnvKey(process.env.JWT_PRIVATE_KEY);
const useAsymmetricJwt =
  isPemKey(privateKey, "PRIVATE") && isPemKey(publicKey, "PUBLIC");

export const protect = asyncWrapper(async (req, res, next) => {
  // 1. Get token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt_access) {
    token = req.cookies.jwt_access;
  }

  if (!token) {
    console.warn(
      `Auth Debug - No Token Found. Cookies: ${Object.keys(req.cookies || {}).join(",")}`,
    );
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  // 2. Check if token is in Redis blacklist (e.g. user logged out)
  let isBlacklisted = false;
  if (isRedisAvailable()) {
    const redisClient = await getRedisClient();
    isBlacklisted = await redisClient.get(`bl_${token}`);
  }

  if (!isBlacklisted) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const blacklisted = await TokenBlacklist.findOne({ token: tokenHash })
      .select("_id")
      .lean();
    isBlacklisted = Boolean(blacklisted);
  }

  if (isBlacklisted) {
    return next(
      new AppError("Token is no longer valid. Please log in again.", 401),
    );
  }

  // 3. Verify token
  let decoded;
  try {
    if (useAsymmetricJwt) {
      decoded = await promisify(jwt.verify)(token, publicKey, {
        algorithms: ["RS256"],
      });
    } else {
      decoded = await promisify(jwt.verify)(token, config.jwt.secret);
    }
  } catch (err) {
    return next(new AppError("Invalid token. Please log in again!", 401));
  }

  // 4. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  // 5. Grant access
  req.user = currentUser;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};
