import { getRedisClient } from './redis.js';

const memorySessions = new Map();
const SESSION_PREFIX = 'session:';

async function getRedis() {
  try {
    const redis = getRedisClient();
    if (redis.status === 'wait') {
      await redis.connect();
    }
    return redis;
  } catch {
    return null;
  }
}

export async function setSession(token, session, ttlSeconds) {
  memorySessions.set(token, session);

  try {
    const redis = await getRedis();
    if (!redis) {
      return 'memory';
    }

    await redis.setex(`${SESSION_PREFIX}${token}`, ttlSeconds, JSON.stringify(session));
    return 'redis';
  } catch {
    return 'memory';
  }
}

export async function getSession(token) {
  try {
    const redis = await getRedis();
    if (redis) {
      const value = await redis.get(`${SESSION_PREFIX}${token}`);
      if (value) {
        return JSON.parse(value);
      }
    }
  } catch {
    return memorySessions.get(token) || null;
  }

  return memorySessions.get(token) || null;
}

export async function deleteSession(token) {
  memorySessions.delete(token);

  try {
    const redis = await getRedis();
    if (redis) {
      await redis.del(`${SESSION_PREFIX}${token}`);
    }
  } catch {
    return;
  }
}

export async function getSessionDriver() {
  try {
    const redis = await getRedis();
    if (!redis) {
      return 'memory';
    }
    const pong = await redis.ping();
    return pong === 'PONG' ? 'redis' : 'memory';
  } catch {
    return 'memory';
  }
}
