import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class RedisSubscriber {
  constructor() {
    this.evaluationChannel = process.env.EVALUATION_CHANNEL || 'evaluation';
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.subscriber = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.subscriber = new Redis(this.redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: null,
      });

      this.setupEventHandlers();

      console.log('✅ Redis Subscriber connected');
      this.isConnected = true;
    } catch (error) {
      console.error('❌ Failed to connect Redis Subscriber:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.subscriber.on('ready', () => {
      console.log('✅ Redis Subscriber ready');
      this.isConnected = true;
    });

    this.subscriber.on('error', (err) => {
      console.error('❌ Redis Subscriber error:', err.message);
      this.isConnected = false;
    });

    this.subscriber.on('reconnecting', () => {
      console.log('🔄 Redis Subscriber reconnecting...');
      this.isConnected = false;
    });

    this.subscriber.on('close', () => {
      console.log('⚠️  Redis Subscriber connection closed');
      this.isConnected = false;
    });

    this.subscriber.on('end', () => {
      console.log('⚠️  Redis Subscriber ended');
      this.isConnected = false;
    });
  }

  async listen() {
    try {
      if (!this.subscriber) {
        await this.connect();
      }

      await this.subscriber.subscribe(this.evaluationChannel);

      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

    } catch (error) {
      console.error('❌ Failed to subscribe to channel:', error.message);
      throw error;
    }
  }

  handleMessage(channel, message) {
    if (channel !== this.evaluationChannel) {
      return;
    }
    console.log('📩 Received message:', message);
    
  }

  async unsubscribe() {
    try {
      if (this.subscriber) {
        await this.subscriber.unsubscribe(this.evaluationChannel);
        console.log(`✅ Unsubscribed from channel: ${this.evaluationChannel}`);
      }
    } catch (error) {
      console.error('❌ Failed to unsubscribe:', error.message);
      throw error;
    }
  }

  async close() {
    try {
      if (this.subscriber) {
        await this.unsubscribe();
        await this.subscriber.quit();
        this.subscriber = null;
        this.isConnected = false;
        console.log('✅ Redis Subscriber closed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to close Redis Subscriber:', error.message);
      throw error;
    }
  }
}

const redisSubscriber = new RedisSubscriber();

export default redisSubscriber;

