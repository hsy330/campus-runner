import mysql from 'mysql2/promise';

import { env } from '../config/env.js';

let pool;

export function getMysqlPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      database: env.mysql.database,
      user: env.mysql.user,
      password: env.mysql.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

export async function pingMysql() {
  try {
    const db = getMysqlPool();
    await db.query('SELECT 1');
    return { ok: true, host: env.mysql.host, database: env.mysql.database };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
