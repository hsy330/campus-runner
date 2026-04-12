import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
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
  const nextOrder = clone(order);
  const index = db.orders.findIndex((item) => item.id === nextOrder.id);
  if (index >= 0) {
    db.orders[index] = { ...db.orders[index], ...nextOrder };
  } else {
    db.orders.unshift(nextOrder);
  }
  return db.orders.find((item) => item.id === nextOrder.id) || nextOrder;
}

async function loadAllOrdersFromMysql() {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return [];
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY updated_at DESC');
    const orders = rows.map(mapOrderRow);
    orders.forEach(syncMemoryOrder);
    return orders;
  } catch {
    return [];
  }
}

export async function createOrderRecord(order) {
  const nextOrder = syncMemoryOrder(order);
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextOrder);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO orders (
        id, owner_user_id, task_id, task_title, campus, status, role, owner_role,
        amount, with_user, timeout_at, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextOrder.id,
        nextOrder.ownerUserId,
        nextOrder.taskId,
        nextOrder.taskTitle,
        nextOrder.campus,
        nextOrder.status,
        nextOrder.role,
        nextOrder.ownerRole,
        nextOrder.amount,
        nextOrder.withUser,
        nextOrder.timeoutAt ? new Date(nextOrder.timeoutAt) : null,
        new Date(nextOrder.updatedAt || Date.now()),
        new Date(nextOrder.createdAt || Date.now())
      ]
    );
  } catch {
    return clone(nextOrder);
  }

  return clone(nextOrder);
}

export async function listOrdersByUserId(userId) {
  if (db.orders.length === 0) {
    await loadAllOrdersFromMysql();
  }
  return clone(
    db.orders
      .filter((item) => item.ownerUserId === userId)
      .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
  );
}

export async function findOrderByTaskAndRole(taskId, ownerRole) {
  if (db.orders.length === 0) {
    await loadAllOrdersFromMysql();
  }
  return clone(db.orders.find((item) => item.taskId === taskId && item.ownerRole === ownerRole) || null);
}

export async function findOrderByTaskAndOwner(taskId, ownerUserId) {
  if (db.orders.length === 0) {
    await loadAllOrdersFromMysql();
  }
  return clone(db.orders.find((item) => item.taskId === taskId && item.ownerUserId === ownerUserId) || null);
}

export async function updateOrderRecord(orderId, patch) {
  if (db.orders.length === 0) {
    await loadAllOrdersFromMysql();
  }

  const current = db.orders.find((item) => item.id === orderId) || null;
  if (!current) {
    return null;
  }

  const nextOrder = syncMemoryOrder({ ...current, ...patch });
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextOrder);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `UPDATE orders SET
        owner_user_id = ?, task_id = ?, task_title = ?, campus = ?, status = ?, role = ?, owner_role = ?,
        amount = ?, with_user = ?, timeout_at = ?, updated_at = ?, created_at = ?
      WHERE id = ?`,
      [
        nextOrder.ownerUserId,
        nextOrder.taskId,
        nextOrder.taskTitle,
        nextOrder.campus,
        nextOrder.status,
        nextOrder.role,
        nextOrder.ownerRole,
        nextOrder.amount,
        nextOrder.withUser,
        nextOrder.timeoutAt ? new Date(nextOrder.timeoutAt) : null,
        new Date(nextOrder.updatedAt || Date.now()),
        new Date(nextOrder.createdAt || Date.now()),
        orderId
      ]
    );
  } catch {
    return clone(nextOrder);
  }

  return clone(nextOrder);
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
  if (db.orders.length === 0) {
    await loadAllOrdersFromMysql();
  }
  return clone(
    db.orders
      .filter((item) => item.taskId === taskId)
      .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
  );
}
