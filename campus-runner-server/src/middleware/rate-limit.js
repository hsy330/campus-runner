import { env } from '../config/env.js';
import { getRedisClient } from '../lib/redis.js';

const memoryCounters = new Map();

async function incrementWithRedis(key, ttlSeconds) {
  try {
    const redis = getRedisClient();
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return { count, driver: 'redis' };
  } catch {
    return null;
  }
}

function incrementWithMemory(key, ttlSeconds) {
  const current = memoryCounters.get(key);
  const now = Date.now();
  if (!current || current.expiresAt <= now) {
    const next = { count: 1, expiresAt: now + ttlSeconds * 1000 };
    memoryCounters.set(key, next);
    return { count: 1, driver: 'memory' };
  }

  current.count += 1;
  memoryCounters.set(key, current);
  return { count: current.count, driver: 'memory' };
}

export async function rateLimitMiddleware(req, res, next) {
  const ttlSeconds = env.rateLimit.windowSeconds;
  const maxRequests = env.rateLimit.maxRequests;
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const key = `rate:${clientIp}:${Math.floor(Date.now() / (ttlSeconds * 1000))}`;

  const redisResult = await incrementWithRedis(key, ttlSeconds);
  const result = redisResult || incrementWithMemory(key, ttlSeconds);

  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Driver', result.driver);

  if (result.count > maxRequests) {
    res.status(429).json({ message: '请求过于频繁，请稍后再试' });
    return;
  }

  next();
}
