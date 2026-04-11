import { db } from '../data/store.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function mapReviewRow(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    speed: Number(row.speed),
    attitude: Number(row.attitude),
    quality: Number(row.quality),
    average: Number(row.average_score),
    comment: row.comment || '',
    createdAt: row.created_at
  };
}

function syncMemoryReview(review) {
  const index = db.reviews.findIndex((item) => item.id === review.id);
  if (index >= 0) {
    db.reviews[index] = { ...db.reviews[index], ...review };
  } else {
    db.reviews.unshift(clone(review));
  }
}

export async function createReviewRecord(review) {
  syncMemoryReview(review);
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return review;
  }

  const pool = getMysqlPool();
  await pool.query(
    `INSERT INTO reviews (
      id, task_id, from_user_id, to_user_id, speed, attitude, quality, average_score, comment, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      review.id,
      review.taskId,
      review.fromUserId,
      review.toUserId,
      review.speed,
      review.attitude,
      review.quality,
      review.average,
      review.comment,
      new Date(review.createdAt || Date.now())
    ]
  );
  return review;
}

export async function listReviewsByToUserId(userId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.reviews.filter((item) => item.toUserId === userId));
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM reviews WHERE to_user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(mapReviewRow);
}

export async function listReviewsByFromUserId(userId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.reviews.filter((item) => item.fromUserId === userId));
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM reviews WHERE from_user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(mapReviewRow);
}

export async function findReviewByTaskAndFromUser(taskId, fromUserId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.reviews.find((item) => item.taskId === taskId && item.fromUserId === fromUserId) || null);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM reviews WHERE task_id = ? AND from_user_id = ? LIMIT 1', [taskId, fromUserId]);
  return rows[0] ? mapReviewRow(rows[0]) : null;
}
