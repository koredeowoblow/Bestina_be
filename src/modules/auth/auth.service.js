import jwt from 'jsonwebtoken';
import config from '../../config/index.js';
import AppError from '../../utils/AppError.js';
import authRepo from './auth.repository.js';
import Session from './session.model.js';
import { getRedisClient, isRedisAvailable } from '../../config/redis.config.js';

if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  throw new Error('FATAL: JWT_PRIVATE_KEY or JWT_PUBLIC_KEY is entirely missing. Provide RS256 keys in .env.');
}

const signToken = (id, expiresIn) => {
  const pKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
  return jwt.sign({ id }, pKey, {
    algorithm: 'RS256',
    expiresIn: expiresIn || config.jwt.accessExpiresIn
  });
};

const createSendToken = async (user, statusCode, req, res, message = 'Success') => {
  const token = signToken(user._id, config.jwt.accessExpiresIn);
  const refreshToken = signToken(user._id, config.jwt.refreshExpiresIn);

  // 1. Save Refresh Session (Token Rotation Base)
  await Session.create({
    user: user._id,
    refreshToken,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days matching JWT config roughly
  });

  // 2. Set HttpOnly strict cookie
  res.cookie('jwt_refresh', refreshToken, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    data: { user, token }
  });
};

class AuthService {
  async register(userData, req, res) {
    const existingUser = await authRepo.findUserByEmail(userData.email);
    if (existingUser) throw new AppError('Email already in use', 400);

    const newUser = await authRepo.createUser(userData);
    await createSendToken(newUser, 201, req, res, 'User registered successfully');
  }

  async login(email, password, req, res) {
    const user = await authRepo.findUserByEmail(email);
    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new AppError('Incorrect email or password', 401);
    }
    await createSendToken(user, 200, req, res, 'Login successful');
  }

  async logout(token, res) {
    let decoded;
    const pubKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    try {
      decoded = jwt.verify(token, pubKey, { algorithms: ['RS256'] });
    } catch (error) {
       throw new AppError('Invalid token', 401);
    }
    
    // Revoke all sessions natively associated with the user for holistic logout
    await Session.deleteMany({ user: decoded.id });

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    if (ttl > 0 && isRedisAvailable()) {
      const redisClient = await getRedisClient();
      await redisClient.set(`bl_${token}`, token, { EX: ttl });
    }

    res.cookie('jwt_refresh', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({ success: true, message: 'Logged out successfully', data: null });
  }

  async refresh(refreshToken, req, res) {
    const pubKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    let decoded;
    
    // Fallback blacklist check on refresh token
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      if ((await redisClient.get(`bl_${refreshToken}`))) {
        throw new AppError('Refresh token revoked. Please login again.', 401);
      }
    }

    try {
      decoded = jwt.verify(refreshToken, pubKey, { algorithms: ['RS256'] });
    } catch (error) {
      throw new AppError('Invalid or expired refresh token. Please login again.', 401);
    }

    // IDEMPOTENCY/THEFT CHECK: Lookup session in DB
    const session = await Session.findOne({ refreshToken });
    if (!session) {
      // DANGER: Token is structurally valid but session is gone or rotated.
      // This implies an attacker might be trying to reuse a consumed token!
      await Session.deleteMany({ user: decoded.id }); // Nuking all sessions (killswitch)
      throw new AppError('Security violation detected. All sessions revoked. Please login again.', 401);
    }

    const currentUser = await authRepo.findUserById(decoded.id);
    if (!currentUser) throw new AppError('The user belonging to this token no longer exists.', 401);

    // Token Rotation Mechanics
    const newAccessToken = signToken(currentUser._id, config.jwt.accessExpiresIn);
    const newRefreshToken = signToken(currentUser._id, config.jwt.refreshExpiresIn);

    // Update existing session
    session.refreshToken = newRefreshToken;
    session.userAgent = req.headers['user-agent'] || session.userAgent;
    session.ip = req.ip || session.ip;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    // Replay Cookie
    res.cookie('jwt_refresh', newRefreshToken, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Token rotated and refreshed successfully',
      data: { user: currentUser, token: newAccessToken }
    });
  }

  async getMe(userId, res) {
    const user = await authRepo.findUserById(userId);
    res.status(200).json({ success: true, message: 'User profile retrieved', data: { user } });
  }
}

export default new AuthService();
