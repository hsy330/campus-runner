import { db } from '../data/store.js';
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
  const index = db.appeals.findIndex((item) => item.id === appeal.id);
  if (index >= 0) {
    db.appeals[index] = { ...db.appeals[index], ...appeal };
  } else {
    db.appeals.unshift(clone(appeal));
  }
}

export async function createAppealRecord(appeal) {
  syncMemoryAppeal(appeal);
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return appeal;
  }

  const pool = getMysqlPool();
  await pool.query(
    `INSERT INTO appeals (
      id, task_id, from_user_id, from_role, reason, detail, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      appeal.id,
      appeal.taskId,
      appeal.fromUserId,
      appeal.fromRole,
      appeal.reason,
      appeal.detail,
      appeal.status,
      new Date(appeal.createdAt || Date.now()),
      appeal.updatedAt ? new Date(appeal.updatedAt) : new Date(appeal.createdAt || Date.now())
    ]
  );
  return appeal;
}

export async function listAppealRecords() {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.appeals);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM appeals ORDER BY created_at DESC');
  return rows.map(mapAppealRow);
}

export async function updateAppealRecord(appealId, patch) {
  const ready = await ensurePersistenceReady();
  let current;
  if (!ready) {
    current = db.appeals.find((item) => item.id === appealId) || null;
  } else {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM appeals WHERE id = ? LIMIT 1', [appealId]);
    current = rows[0] ? mapAppealRow(rows[0]) : null;
  }
  if (!current) {
    return null;
  }

  const next = { ...current, ...patch };
  syncMemoryAppeal(next);

  if (!ready) {
    return next;
  }

  const pool = getMysqlPool();
  await pool.query(
    `UPDATE appeals SET task_id = ?, from_user_id = ?, from_role = ?, reason = ?, detail = ?, status = ?, updated_at = ? WHERE id = ?`,
    [
      next.taskId,
      next.fromUserId,
      next.fromRole,
      next.reason,
      next.detail,
      next.status,
      new Date(next.updatedAt || Date.now()),
      appealId
    ]
  );
  return next;
}
