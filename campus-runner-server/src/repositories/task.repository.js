import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
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
  const nextTask = clone(task);
  const index = db.tasks.findIndex((item) => item.id === nextTask.id);
  if (index >= 0) {
    db.tasks[index] = { ...db.tasks[index], ...nextTask };
  } else {
    db.tasks.unshift(nextTask);
  }
  return db.tasks.find((item) => item.id === nextTask.id) || nextTask;
}

export async function listTasksByFilters(campus, category, sort = 'latest') {
  let source = db.tasks;

  if (source.length === 0) {
    const ready = await ensurePersistenceReady();
    if (ready) {
      try {
        const pool = getMysqlPool();
        const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        source = rows.map(mapTaskRow).filter(Boolean);
        source.forEach(syncMemoryTask);
      } catch {
        source = [];
      }
    }
  }

  const list = source.filter((item) => item.campus === campus && item.status === 'open' && item.auditStatus === 'approved');
  const filtered = category && category !== '全部' ? list.filter((item) => item.category === category) : list;
  const sorted = [...filtered].sort((left, right) => (
    sort === 'price' ? Number(right.price) - Number(left.price) : new Date(right.createdAt) - new Date(left.createdAt)
  ));
  return clone(sorted);
}

export async function findTaskById(taskId) {
  const memoryTask = db.tasks.find((item) => item.id === taskId);
  if (memoryTask) {
    return clone(memoryTask);
  }

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return null;
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);
    const task = mapTaskRow(rows[0]);
    if (task) {
      syncMemoryTask(task);
    }
    return task ? clone(task) : null;
  } catch {
    return null;
  }
}

export async function listTasksByPublisherId(userId) {
  if (db.tasks.length > 0) {
    return clone(db.tasks.filter((item) => item.publisherId === userId));
  }

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return [];
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM tasks WHERE publisher_id = ? ORDER BY created_at DESC', [userId]);
    const tasks = rows.map(mapTaskRow);
    tasks.forEach(syncMemoryTask);
    return clone(tasks);
  } catch {
    return [];
  }
}

export async function createTaskRecord(task) {
  const nextTask = syncMemoryTask(task);
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextTask);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO tasks (
        id, campus, category, title, description, price, pickup_text, delivery_text,
        pickup_latitude, pickup_longitude, pickup_name, delivery_latitude, delivery_longitude, delivery_name,
        deadline_text, distance_text, status, audit_status, publisher_id, publisher_name,
        runner_id, runner_name, images_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextTask.id,
        nextTask.campus,
        nextTask.category,
        nextTask.title,
        nextTask.description,
        nextTask.price,
        nextTask.pickupText,
        nextTask.deliveryText,
        nextTask.pickupLocation ? nextTask.pickupLocation.latitude : null,
        nextTask.pickupLocation ? nextTask.pickupLocation.longitude : null,
        nextTask.pickupLocation ? nextTask.pickupLocation.name : null,
        nextTask.deliveryLocation ? nextTask.deliveryLocation.latitude : null,
        nextTask.deliveryLocation ? nextTask.deliveryLocation.longitude : null,
        nextTask.deliveryLocation ? nextTask.deliveryLocation.name : null,
        nextTask.deadlineText,
        nextTask.distanceText,
        nextTask.status,
        nextTask.auditStatus,
        nextTask.publisherId,
        nextTask.publisherName,
        nextTask.runnerId || null,
        nextTask.runnerName || null,
        JSON.stringify(nextTask.images || []),
        new Date(nextTask.createdAt || Date.now())
      ]
    );
  } catch {
    return clone(nextTask);
  }

  return clone(nextTask);
}

export async function updateTaskRecord(taskId, patch) {
  const current = await findTaskById(taskId);
  if (!current) {
    return null;
  }

  const nextTask = syncMemoryTask({ ...current, ...patch });
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextTask);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `UPDATE tasks SET
        campus = ?, category = ?, title = ?, description = ?, price = ?, pickup_text = ?, delivery_text = ?,
        pickup_latitude = ?, pickup_longitude = ?, pickup_name = ?, delivery_latitude = ?, delivery_longitude = ?, delivery_name = ?,
        deadline_text = ?, distance_text = ?, status = ?, audit_status = ?, publisher_id = ?, publisher_name = ?,
        runner_id = ?, runner_name = ?, images_json = ?
      WHERE id = ?`,
      [
        nextTask.campus,
        nextTask.category,
        nextTask.title,
        nextTask.description,
        nextTask.price,
        nextTask.pickupText,
        nextTask.deliveryText,
        nextTask.pickupLocation ? nextTask.pickupLocation.latitude : null,
        nextTask.pickupLocation ? nextTask.pickupLocation.longitude : null,
        nextTask.pickupLocation ? nextTask.pickupLocation.name : null,
        nextTask.deliveryLocation ? nextTask.deliveryLocation.latitude : null,
        nextTask.deliveryLocation ? nextTask.deliveryLocation.longitude : null,
        nextTask.deliveryLocation ? nextTask.deliveryLocation.name : null,
        nextTask.deadlineText,
        nextTask.distanceText,
        nextTask.status,
        nextTask.auditStatus,
        nextTask.publisherId,
        nextTask.publisherName,
        nextTask.runnerId || null,
        nextTask.runnerName || null,
        JSON.stringify(nextTask.images || []),
        taskId
      ]
    );
  } catch {
    return clone(nextTask);
  }

  return clone(nextTask);
}
