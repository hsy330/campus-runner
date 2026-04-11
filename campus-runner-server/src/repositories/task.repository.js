import { db } from '../data/store.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function mapTaskRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    campus: row.campus,
    category: row.category,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    pickupText: row.pickup_text,
    deliveryText: row.delivery_text,
    pickupLocation: row.pickup_latitude !== null && row.pickup_longitude !== null ? {
      latitude: Number(row.pickup_latitude),
      longitude: Number(row.pickup_longitude),
      name: row.pickup_name || row.pickup_text
    } : null,
    deliveryLocation: row.delivery_latitude !== null && row.delivery_longitude !== null ? {
      latitude: Number(row.delivery_latitude),
      longitude: Number(row.delivery_longitude),
      name: row.delivery_name || row.delivery_text
    } : null,
    deadlineText: row.deadline_text,
    distanceText: row.distance_text,
    status: row.status,
    auditStatus: row.audit_status,
    publisherId: row.publisher_id,
    publisherName: row.publisher_name,
    runnerId: row.runner_id,
    runnerName: row.runner_name,
    images: row.images_json ? JSON.parse(row.images_json) : [],
    createdAt: row.created_at
  };
}

function syncMemoryTask(task) {
  const index = db.tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) {
    db.tasks[index] = { ...db.tasks[index], ...task };
  } else {
    db.tasks.unshift(clone(task));
  }
}

export async function listTasksByFilters(campus, category, sort = 'latest') {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    const list = db.tasks.filter((item) => item.campus === campus && item.status === 'open' && item.auditStatus === 'approved');
    const filtered = category && category !== '全部' ? list.filter((item) => item.category === category) : list;
    return clone(filtered.sort((a, b) => (sort === 'price' ? b.price - a.price : new Date(b.createdAt) - new Date(a.createdAt))));
  }

  const pool = getMysqlPool();
  const params = [campus, 'open', 'approved'];
  let sql = 'SELECT * FROM tasks WHERE campus = ? AND status = ? AND audit_status = ?';
  if (category && category !== '全部') {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += sort === 'price' ? ' ORDER BY price DESC, created_at DESC' : ' ORDER BY created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows.map(mapTaskRow);
}

export async function findTaskById(taskId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.tasks.find((item) => item.id === taskId) || null);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);
  return mapTaskRow(rows[0]);
}

export async function listTasksByPublisherId(userId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(db.tasks.filter((item) => item.publisherId === userId));
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query('SELECT * FROM tasks WHERE publisher_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(mapTaskRow);
}

export async function createTaskRecord(task) {
  syncMemoryTask(task);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return task;
  }

  const pool = getMysqlPool();
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
      new Date(task.createdAt || Date.now())
    ]
  );
  return task;
}

export async function updateTaskRecord(taskId, patch) {
  const current = await findTaskById(taskId);
  if (!current) {
    return null;
  }

  const next = { ...current, ...patch };
  syncMemoryTask(next);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return next;
  }

  const pool = getMysqlPool();
  await pool.query(
    `UPDATE tasks SET
      campus = ?, category = ?, title = ?, description = ?, price = ?, pickup_text = ?, delivery_text = ?,
      pickup_latitude = ?, pickup_longitude = ?, pickup_name = ?, delivery_latitude = ?, delivery_longitude = ?, delivery_name = ?,
      deadline_text = ?, distance_text = ?, status = ?, audit_status = ?, publisher_id = ?, publisher_name = ?,
      runner_id = ?, runner_name = ?, images_json = ?
    WHERE id = ?`,
    [
      next.campus,
      next.category,
      next.title,
      next.description,
      next.price,
      next.pickupText,
      next.deliveryText,
      next.pickupLocation ? next.pickupLocation.latitude : null,
      next.pickupLocation ? next.pickupLocation.longitude : null,
      next.pickupLocation ? next.pickupLocation.name : null,
      next.deliveryLocation ? next.deliveryLocation.latitude : null,
      next.deliveryLocation ? next.deliveryLocation.longitude : null,
      next.deliveryLocation ? next.deliveryLocation.name : null,
      next.deadlineText,
      next.distanceText,
      next.status,
      next.auditStatus,
      next.publisherId,
      next.publisherName,
      next.runnerId || null,
      next.runnerName || null,
      JSON.stringify(next.images || []),
      taskId
    ]
  );
  return next;
}
