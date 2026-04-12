import crypto from 'crypto';

import { db, generateId } from '../data/store.js';
import { env } from '../config/env.js';

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_PASSWORD_KEY_BYTES = 64;
const ADMIN_PASSWORD_DIGEST = 'sha512';

function getAdminSessions() {
  if (!Array.isArray(db.adminSessions)) {
    db.adminSessions = [];
  }
  return db.adminSessions;
}

function getTokenFromRequest(req) {
  return req.headers.authorization?.replace('Bearer ', '') || '';
}

function hashAdminPassword(password, salt) {
  const nextSalt = salt || `admin:${env.admin.username || 'local'}`;
  const derived = crypto.pbkdf2Sync(password, nextSalt, 120000, ADMIN_PASSWORD_KEY_BYTES, ADMIN_PASSWORD_DIGEST).toString('hex');
  return `${nextSalt}:${derived}`;
}

function verifyAdminPassword(password, passwordHash) {
  const [salt, hash] = String(passwordHash || '').split(':');
  if (!salt || !hash) {
    return false;
  }

  const calculated = crypto.pbkdf2Sync(password, salt, 120000, ADMIN_PASSWORD_KEY_BYTES, ADMIN_PASSWORD_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
}

function resolveAdminUsers() {
  if (env.admin.username && (env.admin.passwordHash || env.admin.password)) {
    return [
      {
        id: 'admin_env',
        username: env.admin.username,
        passwordHash: env.admin.passwordHash || hashAdminPassword(env.admin.password, `admin:${env.admin.username}`),
        name: env.admin.name
      }
    ];
  }

  return db.adminUsers || [];
}

export function adminLogin(username, password) {
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');
  const user = resolveAdminUsers().find((item) => item.username === normalizedUsername);
  if (!user || !verifyAdminPassword(normalizedPassword, user.passwordHash)) {
    throw new Error('管理员账号或密码错误');
  }

  const token = generateId('admin_tk');
  getAdminSessions().push({
    token,
    userId: user.id,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    createdAt: Date.now()
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name
    }
  };
}

export function adminLogout(token) {
  db.adminSessions = getAdminSessions().filter((item) => item.token !== token);
  return true;
}

export function verifyAdminToken(token) {
  const session = getAdminSessions().find((item) => item.token === token);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    adminLogout(token);
    return null;
  }

  const user = resolveAdminUsers().find((item) => item.id === session.userId);
  if (!user) {
    adminLogout(token);
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name
  };
}

export function requireAdmin(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new Error('管理员未登录');
  }

  const admin = verifyAdminToken(token);
  if (!admin) {
    throw new Error('管理员登录已过期');
  }

  return admin;
}
