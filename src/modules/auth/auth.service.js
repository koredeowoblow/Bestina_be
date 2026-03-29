import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config/index.js';
import AppError from '../../utils/AppError.js';
import authRepo from './auth.repository.js';
import redisClient from '../../config/redis.config.js';
// Fallback keys for development if not provided in env
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const signToken = (id, expiresIn) => {
  const pKey = process.env.JWT_PRIVATE_KEY ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n') : privateKey;
  return jwt.sign({ id }, pKey, {
    algorithm: 'RS256',
    expiresIn: expiresIn || config.jwt.accessExpiresIn
  });
};

const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id, config.jwt.accessExpiresIn);
  const refreshToken = signToken(user._id, config.jwt.refreshExpiresIn);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user,
      token,
      refreshToken
    }
  });
};

class AuthService {
  async register(userData, res) {
    const existingUser = await authRepo.findUserByEmail(userData.email);
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    const newUser = await authRepo.createUser(userData);
    createSendToken(newUser, 201, res, 'User registered successfully');
  }

  async login(email, password, res) {
    const user = await authRepo.findUserByEmail(email);

    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new AppError('Incorrect email or password', 401);
    }

    createSendToken(user, 200, res, 'Login successful');
  }

  async logout(token, res) {
    // Decode token to get expiration time so we know how long to blacklist it
    let decoded;
    const pubKey = process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : publicKey;
    try {
      decoded = jwt.verify(token, pubKey, { algorithms: ['RS256'] });
    } catch (error) {
       throw new AppError('Invalid token', 401);
    }
    
    const tokenExp = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = tokenExp - now;

    if (ttl > 0) {
      // Add token to Redis blacklist with TTL
      await redisClient.set(`bl_${token}`, token, 'EX', ttl);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null
    });
  }

  async refresh(refreshToken, res) {
    const pubKey = process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : publicKey;
    let decoded;
    
    try {
      decoded = jwt.verify(refreshToken, pubKey, { algorithms: ['RS256'] });
    } catch (error) {
      throw new AppError('Invalid or expired refresh token. Please login again.', 401);
    }

    const isBlacklisted = await redisClient.get(`bl_${refreshToken}`);
    if (isBlacklisted) {
      throw new AppError('Refresh token revoked. Please login again.', 401);
    }

    const currentUser = await authRepo.findUserById(decoded.id);
    if (!currentUser) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    createSendToken(currentUser, 200, res, 'Token refreshed successfully');
  }

  async getMe(userId, res) {
    const user = await authRepo.findUserById(userId);
    res.status(200).json({
      success: true,
      message: 'User profile retrieved',
      data: { user }
    });
  }
}

export default {
  AuthService: new AuthService(),
  signToken,
  publicKey,
  privateKey
};
