import Redis from 'ioredis';
import { config } from './index';

export const redisConnectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // parse the URL into host/port/password for BullMQ
  host: new URL(config.REDIS_URL).hostname,
  port: Number(new URL(config.REDIS_URL).port) || 6379,
  password: new URL(config.REDIS_URL).password || undefined,
  tls: config.REDIS_URL.startsWith('rediss://') ? {} : undefined, // Upstash requires TLS
} as const;

let redisInstance: Redis | null = null;
console.warn('Redis connection options:', redisConnectionOptions);
console.warn('Redis URL:', config.REDIS_URL);
export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(config.REDIS_URL, redisConnectionOptions);

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
