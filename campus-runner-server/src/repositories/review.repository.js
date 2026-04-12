import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
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
  const nextReview = clone(review);
  const index = db.reviews.findIndex((item) => item.id === nextReview.id);
  if (index >= 0) {
    db.reviews[index] = { ...db.reviews[index], ...nextReview };
  } else {
    db.reviews.unshift(nextReview);
  }
  return db.reviews.find((item) => item.id === nextReview.id) || nextReview;
}

async function loadAllReviewsFromMysql() {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return [];
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    const reviews = rows.map(mapReviewRow);
    reviews.forEach(syncMemoryReview);
    return reviews;
  } catch {
    return [];
  }
}

export async function createReviewRecord(review) {
  const nextReview = syncMemoryReview(review);
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextReview);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO reviews (
        id, task_id, from_user_id, to_user_id, speed, attitude, quality, average_score, comment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextReview.id,
        nextReview.taskId,
        nextReview.fromUserId,
        nextReview.toUserId,
        nextReview.speed,
        nextReview.attitude,
        nextReview.quality,
        nextReview.average,
        nextReview.comment,
        new Date(nextReview.createdAt || Date.now())
      ]
    );
  } catch {
    return clone(nextReview);
  }

  return clone(nextReview);
}

export async function listReviewsByToUserId(userId) {
  if (db.reviews.length === 0) {
    await loadAllReviewsFromMysql();
  }
  return clone(db.reviews.filter((item) => item.toUserId === userId));
}

export async function listReviewsByFromUserId(userId) {
  if (db.reviews.length === 0) {
    await loadAllReviewsFromMysql();
  }
  return clone(db.reviews.filter((item) => item.fromUserId === userId));
}

export async function findReviewByTaskAndFromUser(taskId, fromUserId) {
  if (db.reviews.length === 0) {
    await loadAllReviewsFromMysql();
  }
  return clone(db.reviews.find((item) => item.taskId === taskId && item.fromUserId === fromUserId) || null);
}
