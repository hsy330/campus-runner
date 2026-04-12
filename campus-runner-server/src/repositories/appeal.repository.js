import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function mapAppealRow(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    fromUserId: row.from_user_id,
    fromRole: row.from_role,
    reason: row.reason,
    detail: row.detail,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function syncMemoryAppeal(appeal) {
  const nextAppeal = clone(appeal);
  const index = db.appeals.findIndex((item) => item.id === nextAppeal.id);
  if (index >= 0) {
    db.appeals[index] = { ...db.appeals[index], ...nextAppeal };
  } else {
    db.appeals.unshift(nextAppeal);
  }
  return db.appeals.find((item) => item.id === nextAppeal.id) || nextAppeal;
}

async function loadAllAppealsFromMysql() {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return [];
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM appeals ORDER BY created_at DESC');
    const appeals = rows.map(mapAppealRow);
    appeals.forEach(syncMemoryAppeal);
    return appeals;
  } catch {
    return [];
  }
}

export async function createAppealRecord(appeal) {
  const nextAppeal = syncMemoryAppeal(appeal);
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextAppeal);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO appeals (
        id, task_id, from_user_id, from_role, reason, detail, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextAppeal.id,
        nextAppeal.taskId,
        nextAppeal.fromUserId,
        nextAppeal.fromRole,
        nextAppeal.reason,
        nextAppeal.detail,
        nextAppeal.status,
        new Date(nextAppeal.createdAt || Date.now()),
        nextAppeal.updatedAt ? new Date(nextAppeal.updatedAt) : new Date(nextAppeal.createdAt || Date.now())
      ]
    );
  } catch {
    return clone(nextAppeal);
  }

  return clone(nextAppeal);
}

export async function listAppealRecords() {
  if (db.appeals.length === 0) {
    await loadAllAppealsFromMysql();
  }
  return clone(
    [...db.appeals].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
  );
}

export async function findAppealRecordById(appealId) {
  if (db.appeals.length === 0) {
    await loadAllAppealsFromMysql();
  }
  return clone(db.appeals.find((item) => item.id === appealId) || null);
}

export async function listAppealRecordsByTaskId(taskId) {
  if (db.appeals.length === 0) {
    await loadAllAppealsFromMysql();
  }
  return clone(
    db.appeals
      .filter((item) => item.taskId === taskId)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
  );
}

export async function updateAppealRecord(appealId, patch) {
  if (db.appeals.length === 0) {
    await loadAllAppealsFromMysql();
  }

  const current = db.appeals.find((item) => item.id === appealId) || null;
  if (!current) {
    return null;
  }

  const nextAppeal = syncMemoryAppeal({ ...current, ...patch });
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextAppeal);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `UPDATE appeals SET task_id = ?, from_user_id = ?, from_role = ?, reason = ?, detail = ?, status = ?, updated_at = ? WHERE id = ?`,
      [
        nextAppeal.taskId,
        nextAppeal.fromUserId,
        nextAppeal.fromRole,
        nextAppeal.reason,
        nextAppeal.detail,
        nextAppeal.status,
        new Date(nextAppeal.updatedAt || Date.now()),
        appealId
      ]
    );
  } catch {
    return clone(nextAppeal);
  }

  return clone(nextAppeal);
}
