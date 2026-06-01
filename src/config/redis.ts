import Redis from 'ioredis';
import { config } from './index';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      keyPrefix: config.REDIS_PREFIX,
    });

    redisInstance.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
