export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'campus_runner',
    user: process.env.MYSQL_USER || 'campus_runner',
    password: process.env.MYSQL_PASSWORD || 'change_me'
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || ''
  },
  rateLimit: {
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120)
  },
  admin: {
    username: process.env.ADMIN_USERNAME || '',
    name: process.env.ADMIN_NAME || '系统管理员',
    password: process.env.ADMIN_PASSWORD || '',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || ''
  },
  tencent: {
    mapKey: process.env.TENCENT_MAP_KEY || '',
    imSdkAppId: process.env.TENCENT_IM_SDKAPPID || '',
    imSecretKey: process.env.TENCENT_IM_SECRET_KEY || ''
  }
};
