import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import redisClient from './database/redis.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import authRoutes from './controller/authController.js';
import evaluateRoutes from './controller/evaluateController.js';
import redisSubscriber from './database/redisSubscriber.js';
import suggestRoutes from './controller/suggestController.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


/**
 * CORS Configuration
 * Cho phép các domain khác gọi API
 */
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Body Parser
 * Parse JSON và URL-encoded data
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request Logger Middleware
 * Log tất cả các request (có thể tắt ở production)
 */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});


/**
 * Mount API routes với prefix /api
 */
app.use('/api/auth', authRoutes);
app.use('/api/evaluate', evaluateRoutes);
app.use('/api/suggest', suggestRoutes);


/**
 * Global Error Handler
 * Xử lý tất cả các lỗi chưa được catch
 */
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:', err);

  // Lỗi cú pháp JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON syntax',
      error: 'INVALID_JSON'
    });
  }

  // Lỗi chung
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.name || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * 404 Handler - Route không tồn tại
 * Phải đặt sau tất cả các routes khác
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});


/**
 * Khởi động server
 */
const startServer = async () => {
  try {
    console.log('\n🚀 Starting Server...\n')

    console.log('🗄️  Connecting to PostgreSQL...');
    await connectDatabase();

    console.log('📦 Connecting to Redis...');
    await redisClient.connect();

    console.log('📦 Connecting to Redis Subscriber...');
    await redisSubscriber.listen();

    const server = app.listen(PORT, () => {
      console.log('\n✅ Server started successfully!\n');
    });

    // 4. Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

      // Đóng server (không nhận request mới)
      server.close(async () => {
        console.log('✅ HTTP server closed');

        try {
          await disconnectDatabase();
          await redisClient.disconnect();
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Timeout sau 10 giây nếu shutdown không hoàn thành
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Lắng nghe các signal để graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Xử lý uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Xử lý unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;

