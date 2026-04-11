import { db, generateId } from '../data/store.js';

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getAdminSessions() {
  if (!Array.isArray(db.adminSessions)) {
    db.adminSessions = [];
  }
  return db.adminSessions;
}

function getTokenFromRequest(req) {
  return req.headers.authorization?.replace('Bearer ', '') || '';
}

export function adminLogin(username, password) {
  const user = (db.adminUsers || []).find(
    (item) => item.username === String(username || '').trim() && item.password === String(password || '')
  );
  if (!user) {
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

  const user = (db.adminUsers || []).find((item) => item.id === session.userId);
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
