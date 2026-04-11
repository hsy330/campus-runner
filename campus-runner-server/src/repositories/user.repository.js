import { db } from '../data/store.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username || '',
    passwordHash: row.password_hash || '',
    nickname: row.nickname,
    avatar: row.avatar,
    campus: row.campus,
    verified: Boolean(row.verified),
    authStatus: row.auth_status,
    realName: row.real_name,
    studentNo: row.student_no,
    rating: Number(row.rating || 0),
    completedCount: Number(row.completed_count || 0),
    wallet: Number(row.wallet || 0),
    score: Number(row.score || 100),
    createdAt: row.created_at,
    openid: row.openid || ''
  };
}

function syncMemoryUser(user) {
  const index = db.users.findIndex((item) => item.id === user.id);
  if (index >= 0) {
    db.users[index] = { ...db.users[index], ...user };
  } else {
    db.users.push({ ...user });
  }
}

export async function findUserById(userId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return db.users.find((item) => item.id === userId) || null;
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return mapUserRow(rows[0]);
}

export async function findUserByOpenid(openid) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return db.users.find((item) => item.openid === openid) || null;
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);
  return mapUserRow(rows[0]);
}

export async function findUserByUsername(username) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return db.users.find((item) => item.username === username) || null;
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return mapUserRow(rows[0]);
}

export async function createUser(user) {
  syncMemoryUser(user);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return user;
  }

  const pool = getMysqlPool();
  await pool.query(
    `INSERT INTO users (
      id, username, password_hash, nickname, avatar, campus, verified, auth_status, real_name, student_no,
      rating, completed_count, wallet, score, created_at, openid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.username || '',
      user.passwordHash || '',
      user.nickname || '',
      user.avatar || '',
      user.campus || '',
      user.verified ? 1 : 0,
      user.authStatus || '未实名',
      user.realName || '',
      user.studentNo || '',
      user.rating || 0,
      user.completedCount || 0,
      user.wallet || 0,
      user.score || 100,
      new Date(user.createdAt || Date.now()),
      user.openid || ''
    ]
  );
  return user;
}

export async function updateUser(userId, patch) {
  const current = await findUserById(userId);
  if (!current) {
    return null;
  }

  const next = { ...current, ...patch };
  syncMemoryUser(next);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return next;
  }

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

  return next;
}
