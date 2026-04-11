import crypto from 'crypto';

import { generateId } from '../data/store.js';
import { createUser, findUserById, findUserByUsername, updateUser } from '../repositories/user.repository.js';
import { deleteSession, getSession, setSession } from '../lib/session-store.js';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 64;
const PASSWORD_DIGEST = 'sha512';

function hashPassword(password, salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString('hex')) {
  const derived = crypto.pbkdf2Sync(password, salt, 120000, PASSWORD_KEY_BYTES, PASSWORD_DIGEST).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, hash] = String(passwordHash || '').split(':');
  if (!salt || !hash) {
    return false;
  }
  const calculated = crypto.pbkdf2Sync(password, salt, 120000, PASSWORD_KEY_BYTES, PASSWORD_DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username || '',
    nickname: user.nickname,
    avatar: user.avatar,
    campus: user.campus,
    verified: user.verified,
    authStatus: user.authStatus,
    wallet: user.wallet,
    realName: user.realName || '',
    studentNo: user.studentNo || '',
    rating: user.rating || 0,
    completedCount: user.completedCount || 0,
    score: user.score || 100
  };
}

async function createLoginSession(user) {
  const token = generateId('tk');
  await setSession(token, {
    userId: user.id,
    username: user.username || '',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  }, SESSION_TTL_SECONDS);
  return token;
}

export async function registerWithPassword(payload) {
  const username = String(payload.username || '').trim();
  const nickname = String(payload.nickname || '').trim();
  const campus = String(payload.campus || '').trim();
  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');

  if (!username) {
    throw new Error('请输入用户名');
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new Error('用户名需为 3-20 位字母、数字或下划线');
  }
  if (!nickname) {
    throw new Error('请输入昵称');
  }
  if (!campus) {
    throw new Error('请选择校区');
  }
  if (password.length < 6) {
    throw new Error('密码长度不能少于 6 位');
  }
  if (password !== confirmPassword) {
    throw new Error('两次输入的密码不一致');
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    throw new Error('用户名已存在');
  }

  const user = await createUser({
    id: generateId('u'),
    username,
    passwordHash: hashPassword(password),
    nickname,
    avatar: '',
    campus,
    verified: false,
    authStatus: '未实名',
    realName: '',
    studentNo: '',
    rating: 0,
    completedCount: 0,
    wallet: 30,
    score: 100,
    openid: '',
    createdAt: new Date().toISOString()
  });

  const token = await createLoginSession(user);
  return {
    token,
    user: sanitizeUser(user)
  };
}

export async function loginWithPassword(username, password) {
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');
  if (!normalizedUsername || !normalizedPassword) {
    throw new Error('请输入用户名和密码');
  }

  const user = await findUserByUsername(normalizedUsername);
  if (!user || !verifyPassword(normalizedPassword, user.passwordHash)) {
    throw new Error('用户名或密码错误');
  }

  const token = await createLoginSession(user);
  return {
    token,
    user: sanitizeUser(user)
  };
}

export function getTokenFromRequest(req) {
  return req.headers.authorization?.replace('Bearer ', '') || '';
}

export async function requireUser(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new Error('未登录');
  }

  const user = await verifyToken(token);
  if (!user) {
    throw new Error('登录已过期');
  }

  return user;
}

export async function verifyToken(token) {
  const session = await getSession(token);
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    await deleteSession(token);
    return null;
  }

  const user = await findUserById(session.userId);
  return user || null;
}

export async function updateUserProfile(userId, data) {
  const currentUser = await findUserById(userId);
  if (!currentUser) {
    throw new Error('用户不存在');
  }

  const patch = { ...data };
  delete patch.password;
  delete patch.passwordHash;
  delete patch.username;

  if (Object.prototype.hasOwnProperty.call(patch, 'campus')) {
    patch.campus = String(patch.campus || '').trim();
    if (!patch.campus) {
      throw new Error('校区不能为空');
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'nickname')) {
    patch.nickname = String(patch.nickname || '').trim();
    if (!patch.nickname) {
      throw new Error('昵称不能为空');
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'realName') || Object.prototype.hasOwnProperty.call(patch, 'studentNo')) {
    patch.authStatus = '审核中';
    patch.verified = false;
  }

  return updateUser(userId, patch);
}
