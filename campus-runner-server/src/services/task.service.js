import { db, generateId } from '../data/store.js';
import { createWalletFlow, getProfile } from './profile.service.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import {
  createTaskRecord,
  findTaskById,
  listTasksByFilters,
  updateTaskRecord
} from '../repositories/task.repository.js';
import {
  createOrderRecord,
  findOrderByTaskAndOwner,
  findOrderByTaskAndRole,
  listOrdersByUserId,
  updateOrdersByTaskId,
  updateOrderRecord
} from '../repositories/order.repository.js';
import {
  createReviewRecord,
  findReviewByTaskAndFromUser,
  listReviewsByToUserId
} from '../repositories/review.repository.js';
import { createAppealRecord, listAppealRecords, updateAppealRecord } from '../repositories/appeal.repository.js';
import { scanTextForSensitiveWords } from './moderation.service.js';

const AUTO_APPROVE_TASKS = true;

function validateSensitive(text) {
  const result = scanTextForSensitiveWords(text);
  if (!result.passed) {
    throw new Error(`内容包含敏感词：${result.hitWords.join('、')}`);
  }
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function listTasks(campus, category, sort = 'latest') {
  return clone(await listTasksByFilters(campus, category, sort));
}

export async function getTaskDetail(taskId) {
  return clone(await findTaskById(taskId));
}

export async function publishTask(userId, payload) {
  const profile = await getProfile(userId);
  if (!profile) {
    throw new Error('用户不存在');
  }

  const amount = Number(payload.price || 0);
  validateSensitive(`${payload.title || ''} ${payload.description || ''}`);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('积分报价必须大于 0');
  }
  if (profile.wallet < amount) {
    throw new Error('钱包余额不足，请先充值');
  }

  const user = await findUserById(userId);
  user.wallet -= amount;
  await updateUser(userId, { wallet: user.wallet });

  const task = {
    id: generateId('task'),
    campus: payload.campus || profile.campus,
    category: payload.category || '跑腿',
    title: payload.title,
    description: payload.description,
    price: amount,
    pickupText: payload.pickupText,
    deliveryText: payload.deliveryText,
    pickupLocation: payload.pickupLocation || null,
    deliveryLocation: payload.deliveryLocation || null,
    deadlineText: payload.deadlineText || '尽快',
    distanceText: payload.distanceText || '待腾讯位置服务计算',
    status: 'open',
    auditStatus: AUTO_APPROVE_TASKS ? 'approved' : 'pending',
    publisherId: profile.id,
    publisherName: profile.nickname,
    images: Array.isArray(payload.images) ? payload.images : [],
    createdAt: new Date().toISOString()
  };

  await createTaskRecord(task);
  db.moderationLogs.unshift({
    id: generateId('mod'),
    type: 'task',
    targetId: task.id,
    status: task.auditStatus,
    contentPreview: task.title,
    createdAt: new Date().toISOString()
  });
  await createOrderRecord({
    id: generateId('order'),
    ownerUserId: userId,
    taskId: task.id,
    taskTitle: task.title,
    campus: task.campus,
    status: 'open_waiting',
    role: 'publisher',
    ownerRole: 'publisher',
    amount,
    withUser: '待接单',
    timeoutAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });
  await createWalletFlow(userId, '发布任务冻结积分', 'freeze', -amount, user.wallet);

  return clone(task);
}

export async function acceptTask(userId, taskId) {
  const task = await findTaskById(taskId);
  const user = await getProfile(userId);

  if (!task || task.status !== 'open' || task.auditStatus !== 'approved') {
    throw new Error('任务已不可接单');
  }
  if (task.publisherId === userId) {
    throw new Error('不能接自己发布的任务');
  }

  task.status = 'accepted';
  task.runnerId = userId;
  task.runnerName = user.nickname;
  await updateTaskRecord(taskId, task);

  const timeoutAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  await createOrderRecord({
    id: generateId('order'),
    ownerUserId: userId,
    taskId,
    taskTitle: task.title,
    campus: task.campus,
    status: 'accepted',
    role: 'runner',
    ownerRole: 'runner',
    amount: task.price,
    withUser: task.publisherName,
    timeoutAt,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  const publisherOrder = await findOrderByTaskAndRole(taskId, 'publisher');
  if (publisherOrder) {
    await updateOrderRecord(publisherOrder.id, {
      status: 'accepted',
      withUser: user.nickname,
      timeoutAt,
      updatedAt: new Date().toISOString()
    });
  }

  return clone(task);
}

export async function listOrders(userId) {
  const orders = (await listOrdersByUserId(userId))
    .map((item) => ({
      ...item,
      reviewed: Boolean(awaitReviewExists(item.taskId, userId))
    }));
  return clone(orders);
}

function awaitReviewExists(taskId, userId) {
  return db.reviews.some((review) => review.taskId === taskId && review.fromUserId === userId);
}

export async function updateTaskStatus(userId, taskId, nextStatus) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  const allowedTransitions = {
    accepted: ['running'],
    running: ['confirming'],
    confirming: ['finished']
  };

  if (!allowedTransitions[task.status] || !allowedTransitions[task.status].includes(nextStatus)) {
    throw new Error('当前状态不可流转');
  }

  const runnerOnly = ['running', 'confirming'];
  const publisherOnly = ['finished'];

  if (runnerOnly.includes(nextStatus) && task.runnerId !== userId) {
    throw new Error('只有接单者可以推进当前状态');
  }

  if (publisherOnly.includes(nextStatus) && task.publisherId !== userId) {
    throw new Error('只有发布者可以完成验收');
  }

  task.status = nextStatus;
  if (nextStatus === 'confirming') {
    task.confirmingAt = new Date().toISOString();
  }
  await updateTaskRecord(taskId, task);
  await updateOrdersByTaskId(taskId, {
    status: nextStatus,
    updatedAt: new Date().toISOString()
  });

  if (nextStatus === 'finished') {
    const runner = await findUserById(task.runnerId);
    if (runner) {
      runner.wallet += task.price;
      runner.completedCount = (runner.completedCount || 0) + 1;
      await updateUser(runner.id, { wallet: runner.wallet, completedCount: runner.completedCount });
      await createWalletFlow(runner.id, '任务完成收入', 'income', task.price, runner.wallet);
    }

    const publisher = await findUserById(task.publisherId);
    if (publisher) {
      publisher.completedCount = (publisher.completedCount || 0) + 1;
      await updateUser(publisher.id, { completedCount: publisher.completedCount });
      await createWalletFlow(publisher.id, '任务完成扣款结算', 'expense', 0, publisher.wallet);
    }
  }

  return clone(task);
}

export async function createTaskReview(userId, taskId, payload) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.status !== 'finished') {
    throw new Error('只有已完成订单才能评价');
  }

  const myOrder = await findOrderByTaskAndOwner(taskId, userId);
  if (!myOrder) {
    throw new Error('你不是该订单参与方');
  }

  const exists = await findReviewByTaskAndFromUser(taskId, userId);
  if (exists) {
    throw new Error('你已评价过该订单');
  }

  const targetUserId = userId === task.publisherId ? task.runnerId : task.publisherId;
  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw new Error('评价对象不存在');
  }

  const speed = Number(payload.speed || 0);
  const attitude = Number(payload.attitude || 0);
  const quality = Number(payload.quality || 0);
  const comment = String(payload.comment || '').trim();
  const scores = [speed, attitude, quality];

  if (scores.some((item) => !Number.isFinite(item) || item < 1 || item > 5)) {
    throw new Error('评分需在 1 到 5 分之间');
  }

  const average = Number(((speed + attitude + quality) / 3).toFixed(1));
  const review = {
    id: generateId('review'),
    taskId,
    fromUserId: userId,
    toUserId: targetUserId,
    speed,
    attitude,
    quality,
    average,
    comment,
    createdAt: new Date().toISOString()
  };

  await createReviewRecord(review);

  const relatedReviews = await listReviewsByToUserId(targetUserId);
  const avgRating = relatedReviews.reduce((sum, item) => sum + item.average, 0) / relatedReviews.length;
  targetUser.rating = Number(avgRating.toFixed(1));
  await updateUser(targetUserId, { rating: targetUser.rating });

  return clone(review);
}

export async function createTaskAppeal(userId, taskId, payload) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  const myOrder = await findOrderByTaskAndOwner(taskId, userId);
  if (!myOrder) {
    throw new Error('你不是该订单参与方');
  }

  const reason = String(payload.reason || '').trim();
  const detail = String(payload.detail || '').trim();
  if (!reason) {
    throw new Error('请选择申诉原因');
  }
  if (!detail) {
    throw new Error('请填写申诉说明');
  }

  const appeal = {
    id: generateId('appeal'),
    taskId,
    fromUserId: userId,
    fromRole: myOrder.role,
    reason,
    detail,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await createAppealRecord(appeal);
  return clone(appeal);
}

export async function listAppeals() {
  const appeals = await listAppealRecords();
  return clone(
    appeals.map((item) => {
      const task = db.tasks.find((taskItem) => taskItem.id === item.taskId);
      const fromUser = db.users.find((user) => user.id === item.fromUserId);
      return {
        ...item,
        taskTitle: task ? task.title : '订单任务',
        fromUserName: fromUser ? fromUser.nickname : '匿名同学'
      };
    })
  );
}

export async function handleAppeal(appealId, status) {
  if (!['resolved', 'rejected'].includes(status)) {
    throw new Error('处理结果不合法');
  }

  const appeal = await updateAppealRecord(appealId, {
    status,
    updatedAt: new Date().toISOString()
  });
  if (!appeal) {
    throw new Error('申诉工单不存在');
  }
  return clone(appeal);
}

export function listModerationLogs() {
  return clone(db.moderationLogs);
}

export async function approveTask(taskId) {
  const task = db.tasks.find((item) => item.id === taskId);
  const log = db.moderationLogs.find((item) => item.targetId === taskId);
  if (!task) {
    throw new Error('任务不存在');
  }
  task.auditStatus = 'approved';
  await updateTaskRecord(taskId, { auditStatus: 'approved' });
  if (log) {
    log.status = 'approved';
  }
  return clone(task);
}
