import express from 'express';

import { env } from '../config/env.js';
import { pingMysql } from '../lib/mysql.js';
import { pingRedis } from '../lib/redis.js';
import { getSessionDriver } from '../lib/session-store.js';

const router = express.Router();

router.get('/system/dependencies', async (req, res) => {
  const [mysql, redis, sessionDriver] = await Promise.all([pingMysql(), pingRedis(), getSessionDriver()]);

  res.json({
    data: {
      service: 'campus-runner-server',
      nodeEnv: env.nodeEnv,
      mysql,
      redis,
      session: {
        driver: sessionDriver
      },
      rateLimit: {
        windowSeconds: env.rateLimit.windowSeconds,
        maxRequests: env.rateLimit.maxRequests
      },
      tencent: {
        mapConfigured: Boolean(env.tencent.mapKey),
        imConfigured: Boolean(env.tencent.imSdkAppId && env.tencent.imSecretKey)
      }
    }
  });
});

export default router;
