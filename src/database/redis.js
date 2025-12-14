import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';

dotenv.config();

/**
 * Redis Client Configuration
 * Khởi tạo và kết nối Redis client
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.queue = {
      evaluate: null,
      suggest: null,
    };
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const evaluateQueueName = process.env.EVALUATE_QUEUE_NAME || 'evaluate';
      const suggestQueueName = process.env.SUGGEST_QUEUE_NAME || 'suggest';
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('⚠️  Redis connection closed');
        this.isConnected = false;
      });

      await this.client.ping();

      this.queue.evaluate = new Queue(evaluateQueueName, {
        connection: redisUrl
      });
      this.queue.suggest = new Queue(suggestQueueName, {
        connection: redisUrl
      });
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      throw error;
    }
  }

  async setToken(key, value, ttl = 60 * 60 * 24 * 7) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }

      // Nếu value là object, chuyển thành JSON string
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
      
      // Set với TTL
      const result = await this.client.setex(key, ttl, valueToStore);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getToken(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }

      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteToken(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }

      const result = await this.client.del(key);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      throw error;
    }
  }
                  

   sendToQueue(queue, job, message) {
    this.queue[queue].add(job, message);
  }
}

const redisClient = new RedisClient();

export default redisClient;

