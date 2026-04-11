import { db } from '../data/store.js';
import { getMysqlPool, pingMysql } from '../lib/mysql.js';

let initialized = false;

function toMysqlDate(value) {
  if (!value) {
    return new Date();
  }
  return new Date(value);
}

async function seedUsers(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (rows[0].count > 0) {
    return;
  }

  for (const user of db.users) {
    await pool.query(
      `INSERT INTO users (
        id, openid, nickname, avatar, campus, verified, auth_status, real_name, student_no,
        rating, completed_count, wallet, score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.openid || '',
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
        toMysqlDate(user.createdAt)
      ]
    );
  }
}

async function seedWalletFlows(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM wallet_flows');
  if (rows[0].count > 0) {
    return;
  }

  for (const flow of db.walletFlows) {
    await pool.query(
      `INSERT INTO wallet_flows (
        id, user_id, title, type, amount, balance_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        flow.id,
        flow.userId,
        flow.title,
        flow.type,
        flow.amount,
        flow.balanceAfter,
        toMysqlDate(flow.createdAt)
      ]
    );
  }
}

async function seedTasks(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM tasks');
  if (rows[0].count > 0) {
    return;
  }

  for (const task of db.tasks) {
    await pool.query(
      `INSERT INTO tasks (
        id, campus, category, title, description, price, pickup_text, delivery_text,
        pickup_latitude, pickup_longitude, pickup_name, delivery_latitude, delivery_longitude, delivery_name,
        deadline_text, distance_text, status, audit_status, publisher_id, publisher_name,
        runner_id, runner_name, images_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.campus,
        task.category,
        task.title,
        task.description,
        task.price,
        task.pickupText,
        task.deliveryText,
        task.pickupLocation ? task.pickupLocation.latitude : null,
        task.pickupLocation ? task.pickupLocation.longitude : null,
        task.pickupLocation ? task.pickupLocation.name : null,
        task.deliveryLocation ? task.deliveryLocation.latitude : null,
        task.deliveryLocation ? task.deliveryLocation.longitude : null,
        task.deliveryLocation ? task.deliveryLocation.name : null,
        task.deadlineText,
        task.distanceText,
        task.status,
        task.auditStatus,
        task.publisherId,
        task.publisherName,
        task.runnerId || null,
        task.runnerName || null,
        JSON.stringify(task.images || []),
        toMysqlDate(task.createdAt)
      ]
    );
  }
}

async function seedOrders(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM orders');
  if (rows[0].count > 0) {
    return;
  }

  for (const order of db.orders) {
    await pool.query(
      `INSERT INTO orders (
        id, owner_user_id, task_id, task_title, campus, status, role, owner_role,
        amount, with_user, timeout_at, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.ownerUserId,
        order.taskId,
        order.taskTitle,
        order.campus,
        order.status,
        order.role,
        order.ownerRole,
        order.amount,
        order.withUser,
        order.timeoutAt ? toMysqlDate(order.timeoutAt) : null,
        toMysqlDate(order.updatedAt),
        toMysqlDate(order.createdAt)
      ]
    );
  }
}

async function seedReviews(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM reviews');
  if (rows[0].count > 0) {
    return;
  }

  for (const review of db.reviews) {
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
        review.comment || '',
        toMysqlDate(review.createdAt)
      ]
    );
  }
}

async function seedAppeals(pool) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM appeals');
  if (rows[0].count > 0) {
    return;
  }

  for (const appeal of db.appeals) {
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
        toMysqlDate(appeal.createdAt),
        toMysqlDate(appeal.updatedAt || appeal.createdAt)
      ]
    );
  }
}

export async function ensurePersistenceReady() {
  if (initialized) {
    return true;
  }

  try {
    const mysqlState = await pingMysql();
    if (!mysqlState.ok) {
      return false;
    }

    const pool = getMysqlPool();
    await seedUsers(pool);
    await seedWalletFlows(pool);
    await seedTasks(pool);
    await seedOrders(pool);
    await seedReviews(pool);
    await seedAppeals(pool);
    initialized = true;
    return true;
  } catch {
    return false;
  }
}
