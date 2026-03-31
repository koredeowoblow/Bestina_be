import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../../config/index.js";
import AppError from "../../utils/AppError.js";
import authRepo from "./auth.repository.js";
import Session from "./session.model.js";
import { getRedisClient, isRedisAvailable } from "../../config/redis.config.js";
import emailService from "../../utils/email.service.js";

const normalizeEnvKey = (envValue) => {
  if (!envValue || typeof envValue !== "string") return "";
  return envValue.replace(/\\n/g, "\n").trim();
};

const isPemKey = (keyValue, keyType) => {
  if (!keyValue) return false;
  return keyValue.includes(`-----BEGIN ${keyType} KEY-----`);
};

const privateKey = normalizeEnvKey(process.env.JWT_PRIVATE_KEY);
const publicKey = normalizeEnvKey(process.env.JWT_PUBLIC_KEY);
const useAsymmetricJwt =
  isPemKey(privateKey, "PRIVATE") && isPemKey(publicKey, "PUBLIC");

const signToken = (id, expiresIn) => {
  if (useAsymmetricJwt) {
    return jwt.sign({ id }, privateKey, {
      algorithm: "RS256",
      expiresIn: expiresIn || config.jwt.accessExpiresIn,
    });
  }
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.accessExpiresIn,
  });
};

const createSendToken = async (
  user,
  statusCode,
  req,
  res,
  message = "Success",
) => {
  const token = signToken(user._id, config.jwt.accessExpiresIn);
  const refreshToken = signToken(user._id, config.jwt.refreshExpiresIn);

  // 1. Save Refresh Session (Token Rotation Base)
  await Session.create({
    user: user._id,
    refreshToken,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days matching JWT config roughly
  });

  // 2. Set HttpOnly strict cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || req.secure || req.get('x-forwarded-proto') === 'https',
    sameSite: req.get('origin')?.includes('localhost') ? 'lax' : 'none',
  };

  res.cookie("jwt_access", token, {
    ...cookieOptions,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // Access token short-lived, but we keep the cookie 24h
  });

  res.cookie("jwt_refresh", refreshToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    data: { user, token },
  });
};

class AuthService {
  async register(userData, req, res) {
    const existingUser = await authRepo.findUserByEmail(userData.email);
    if (existingUser) throw new AppError("Email already in use", 400);

    const newUser = await authRepo.createUser(userData);
    await createSendToken(
      newUser,
      201,
      req,
      res,
      "User registered successfully",
    );
  }

  async login(email, password, req, res) {
    const user = await authRepo.findUserByEmail(email);
    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new AppError("Incorrect email or password", 401);
    }
    await createSendToken(user, 200, req, res, "Login successful");
  }

  async logout(token, res) {
    let decoded;
    try {
      if (useAsymmetricJwt) {
        decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
      } else {
        decoded = jwt.verify(token, config.jwt.secret);
      }
    } catch (error) {
      throw new AppError("Invalid token", 401);
    }

    // Revoke all sessions natively associated with the user for holistic logout
    await Session.deleteMany({ user: decoded.id });

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    if (ttl > 0 && isRedisAvailable()) {
      const redisClient = await getRedisClient();
      await redisClient.set(`bl_${token}`, token, { EX: ttl });
    }

    res.cookie("jwt_access", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.cookie("jwt_refresh", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res
      .status(200)
      .json({ success: true, message: "Logged out successfully", data: null });
  }

  async refresh(refreshToken, req, res) {
    let decoded;

    // Fallback blacklist check on refresh token
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      if (await redisClient.get(`bl_${refreshToken}`)) {
        throw new AppError("Refresh token revoked. Please login again.", 401);
      }
    }

    try {
      if (useAsymmetricJwt) {
        decoded = jwt.verify(refreshToken, publicKey, {
          algorithms: ["RS256"],
        });
      } else {
        decoded = jwt.verify(refreshToken, config.jwt.secret);
      }
    } catch (error) {
      throw new AppError(
        "Invalid or expired refresh token. Please login again.",
        401,
      );
    }

    // IDEMPOTENCY/THEFT CHECK: Lookup session in DB
    const session = await Session.findOne({ refreshToken });
    if (!session) {
      // DANGER: Token is structurally valid but session is gone or rotated.
      // This implies an attacker might be trying to reuse a consumed token!
      await Session.deleteMany({ user: decoded.id }); // Nuking all sessions (killswitch)
      throw new AppError(
        "Security violation detected. All sessions revoked. Please login again.",
        401,
      );
    }

    const currentUser = await authRepo.findUserById(decoded.id);
    if (!currentUser)
      throw new AppError(
        "The user belonging to this token no longer exists.",
        401,
      );

    // Token Rotation Mechanics
    const newAccessToken = signToken(
      currentUser._id,
      config.jwt.accessExpiresIn,
    );
    const newRefreshToken = signToken(
      currentUser._id,
      config.jwt.refreshExpiresIn,
    );

    // Update existing session
    session.refreshToken = newRefreshToken;
    session.userAgent = req.headers["user-agent"] || session.userAgent;
    session.ip = req.ip || session.ip;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    // Replay Cookies
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" || req.secure || req.get('x-forwarded-proto') === 'https',
        sameSite: req.get('origin')?.includes('localhost') ? 'lax' : 'none',
      };

    res.cookie("jwt_access", newAccessToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.cookie("jwt_refresh", newRefreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(200).json({
      success: true,
      message: "Token rotated and refreshed successfully",
      data: { user: currentUser, token: newAccessToken },
    });
  }

  async getMe(userId, res) {
    const user = await authRepo.findUserById(userId);
    res.status(200).json({
      success: true,
      message: "User profile retrieved",
      data: { user },
    });
  }

  async forgotPassword(email, res) {
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      // Return a success message to prevent user enumeration
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, we sent a password reset link",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour

    await user.save({ validateBeforeSave: false });

    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, we sent a password reset link",
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw new AppError(
        "There was an error sending the email. Try again later!",
        500,
      );
    }
  }

  async resetPassword(token, newPassword, res) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await authRepo.User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Token is invalid or has expired", 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been successfully reset. You can now login.",
    });
  }
}

export default new AuthService();
