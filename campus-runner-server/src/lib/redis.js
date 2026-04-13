import Redis from 'ioredis';

import { env } from '../config/env.js';

let client;

export function getRedisClient() {
  if (!client) {
    client = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null
    });
    client.on('error', () => {
      // Redis is optional in local/dev mode. Errors are surfaced by callers via ping checks.
    });
  }
  return client;
}

export async function pingRedis() {
  try {
    const redis = getRedisClient();
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const pong = await redis.ping();
    return { ok: pong === 'PONG', host: env.redis.host };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
