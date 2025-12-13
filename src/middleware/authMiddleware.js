import redisClient from '../database/redis.js';
import dotenv from 'dotenv';

/**
 * Middleware xác thực token
 * Kiểm tra token từ header Authorization và xác thực với Redis
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No authorization header provided',
        error: 'MISSING_AUTH_HEADER'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid authorization format. Expected: Bearer <token>',
        error: 'INVALID_AUTH_FORMAT'
      });
    }

    const token = authHeader.substring(7);

    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token is empty',
        error: 'EMPTY_TOKEN'
      });
    }

    const userData = await redisClient.getToken(token);
    
    if (!userData) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token is invalid or expired',
        error: 'INVALID_TOKEN'
      });
    }

    req.user = userData;
    req.token = token;

    next();

  } catch (error) {

    if (error.message.includes('Redis is not connected')) {
      return res.status(503).json({
        success: false,
        message: 'Service unavailable: Database connection error',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: 'AUTHENTICATION_ERROR'
    });
  }
};

export default authMiddleware;

