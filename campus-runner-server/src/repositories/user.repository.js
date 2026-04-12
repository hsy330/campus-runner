import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username || '',
    passwordHash: row.password_hash || '',
    nickname: row.nickname || '',
    avatar: row.avatar || '',
    campus: row.campus || '',
    verified: Boolean(row.verified),
    authStatus: row.auth_status || '未实名',
    realName: row.real_name || '',
    studentNo: row.student_no || '',
    rating: Number(row.rating || 0),
    completedCount: Number(row.completed_count || 0),
    wallet: Number(row.wallet || 0),
    score: Number(row.score || 100),
    createdAt: row.created_at,
    openid: row.openid || ''
  };
}

function syncMemoryUser(user) {
  const nextUser = clone(user);
  const index = db.users.findIndex((item) => item.id === nextUser.id);
  if (index >= 0) {
    db.users[index] = { ...db.users[index], ...nextUser };
  } else {
    db.users.push(nextUser);
  }
  return db.users.find((item) => item.id === nextUser.id) || nextUser;
}

function mergeMemoryUser(user) {
  if (!user) {
    return null;
  }
  const memoryUser = db.users.find((item) => item.id === user.id);
  return memoryUser ? { ...user, ...memoryUser } : user;
}

function findMemoryUserById(userId) {
  return db.users.find((item) => item.id === userId) || null;
}

function findMemoryUserByOpenid(openid) {
  return db.users.find((item) => item.openid === openid) || null;
}

function findMemoryUserByUsername(username) {
  return db.users.find((item) => item.username === username) || null;
}

export async function findUserById(userId) {
  const memoryUser = findMemoryUserById(userId);
  if (memoryUser) {
    return clone(memoryUser);
  }

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return null;
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = mergeMemoryUser(mapUserRow(rows[0]));
    if (user) {
      syncMemoryUser(user);
    }
    return user ? clone(user) : null;
  } catch {
    return null;
  }
}

export async function findUserByOpenid(openid) {
  const memoryUser = findMemoryUserByOpenid(openid);
  if (memoryUser) {
    return clone(memoryUser);
  }

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return null;
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);
    const user = mergeMemoryUser(mapUserRow(rows[0]));
    if (user) {
      syncMemoryUser(user);
    }
    return user ? clone(user) : null;
  } catch {
    return null;
  }
}

export async function findUserByUsername(username) {
  const memoryUser = findMemoryUserByUsername(username);
  if (memoryUser) {
    return clone(memoryUser);
  }

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return null;
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    const user = mergeMemoryUser(mapUserRow(rows[0]));
    if (user) {
      syncMemoryUser(user);
    }
    return user ? clone(user) : null;
  } catch {
    return null;
  }
}

export async function createUser(user) {
  const nextUser = syncMemoryUser({
    nickname: '',
    avatar: '',
    blacklist: [],
    ...user
  });
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextUser);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO users (
        id, username, password_hash, nickname, avatar, campus, verified, auth_status, real_name, student_no,
        rating, completed_count, wallet, score, created_at, openid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextUser.id,
        nextUser.username || '',
        nextUser.passwordHash || '',
        nextUser.nickname || '',
        nextUser.avatar || '',
        nextUser.campus || '',
        nextUser.verified ? 1 : 0,
        nextUser.authStatus || '未实名',
        nextUser.realName || '',
        nextUser.studentNo || '',
        nextUser.rating || 0,
        nextUser.completedCount || 0,
        nextUser.wallet || 0,
        nextUser.score || 100,
        new Date(nextUser.createdAt || Date.now()),
        nextUser.openid || ''
      ]
    );
  } catch {
    return clone(nextUser);
  }

  return clone(nextUser);
}

export async function updateUser(userId, patch) {
  const current = await findUserById(userId);
  if (!current) {
    return null;
  }

  const next = syncMemoryUser({
    ...current,
    ...patch
  });
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(next);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `UPDATE users SET
        username = ?, password_hash = ?, nickname = ?, avatar = ?, campus = ?, verified = ?, auth_status = ?, real_name = ?,
        student_no = ?, rating = ?, completed_count = ?, wallet = ?, score = ?, openid = ?
      WHERE id = ?`,
      [
        next.username || '',
        next.passwordHash || '',
        next.nickname || '',
        next.avatar || '',
        next.campus || '',
        next.verified ? 1 : 0,
        next.authStatus || '未实名',
        next.realName || '',
        next.studentNo || '',
        next.rating || 0,
        next.completedCount || 0,
        next.wallet || 0,
        next.score || 100,
        next.openid || '',
        userId
      ]
    );
  } catch {
    return clone(next);
  }

  return clone(next);
}
