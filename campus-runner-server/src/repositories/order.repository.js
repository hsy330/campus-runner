import { db } from '../data/store.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function mapOrderRow(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    campus: row.campus,
    status: row.status,
    role: row.role,
    ownerRole: row.owner_role,
    amount: Number(row.amount),
    withUser: row.with_user,
    timeoutAt: row.timeout_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

function syncMemoryOrder(order) {
  const index = db.orders.findIndex((item) => item.id === order.id);
  if (index >= 0) {
    db.orders[index] = { ...db.orders[index], ...order };
  } else {
    db.orders.unshift(clone(order));
  }
}

export async function createOrderRecord(order) {
  syncMemoryOrder(order);
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return order;
  }

  const pool = getMysqlPool();
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
      order.timeoutAt ? new Date(order.timeoutAt) : null,
      new Date(order.updatedAt || Date.now()),
      new Date(order.createdAt || Date.now())
    ]
  );
  return order;
}

export async function listOrdersByUserId(userId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.orders.filter((item) => item.ownerUserId === userId));
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM orders WHERE owner_user_id = ? ORDER BY updated_at DESC', [userId]);
  return rows.map(mapOrderRow);
}

export async function findOrderByTaskAndRole(taskId, ownerRole) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.orders.find((item) => item.taskId === taskId && item.ownerRole === ownerRole) || null);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM orders WHERE task_id = ? AND owner_role = ? LIMIT 1', [taskId, ownerRole]);
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function findOrderByTaskAndOwner(taskId, ownerUserId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.orders.find((item) => item.taskId === taskId && item.ownerUserId === ownerUserId) || null);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM orders WHERE task_id = ? AND owner_user_id = ? LIMIT 1', [taskId, ownerUserId]);
  return rows[0] ? mapOrderRow(rows[0]) : null;
}

export async function updateOrderRecord(orderId, patch) {
  const ready = await ensurePersistenceReady();
  let current;
  if (!ready) {
    current = db.orders.find((item) => item.id === orderId) || null;
  } else {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId]);
    current = rows[0] ? mapOrderRow(rows[0]) : null;
  }
  if (!current) {
    return null;
  }

  const next = { ...current, ...patch };
  syncMemoryOrder(next);

  if (!ready) {
    return next;
  }

  const pool = getMysqlPool();
  await pool.query(
    `UPDATE orders SET
      owner_user_id = ?, task_id = ?, task_title = ?, campus = ?, status = ?, role = ?, owner_role = ?,
      amount = ?, with_user = ?, timeout_at = ?, updated_at = ?, created_at = ?
    WHERE id = ?`,
    [
      next.ownerUserId,
      next.taskId,
      next.taskTitle,
      next.campus,
      next.status,
      next.role,
      next.ownerRole,
      next.amount,
      next.withUser,
      next.timeoutAt ? new Date(next.timeoutAt) : null,
      new Date(next.updatedAt || Date.now()),
      new Date(next.createdAt || Date.now()),
      orderId
    ]
  );
  return next;
}

export async function updateOrdersByTaskId(taskId, patch) {
  const orders = await listOrdersByTaskId(taskId);
  const updated = [];
  for (const order of orders) {
    updated.push(await updateOrderRecord(order.id, patch));
  }
  return updated;
}

export async function listOrdersByTaskId(taskId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.orders.filter((item) => item.taskId === taskId));
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM orders WHERE task_id = ? ORDER BY updated_at DESC', [taskId]);
  return rows.map(mapOrderRow);
}
