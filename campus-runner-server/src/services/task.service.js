import { db, generateId } from '../data/store.js';
import { applyWalletDelta, createWalletFlow, getProfile, roundAmount } from './profile.service.js';
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
import {
  createAppealRecord,
  findAppealRecordById,
  listAppealRecords,
  listAppealRecordsByTaskId,
  updateAppealRecord
} from '../repositories/appeal.repository.js';
import { scanTextForSensitiveWords } from './moderation.service.js';
import { isBlacklisted } from './social.service.js';
import { saveSnapshot } from '../lib/file-persist.js';
import {
  ORDER_STATUS,
  PUBLISHER_ONLY_NEXT_STATUSES,
  RUNNER_ONLY_NEXT_STATUSES,
  TASK_ALLOWED_TRANSITIONS,
  TASK_STATUS,
  canAppealTaskStatus
} from '../lib/task-status.js';

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

function normalizeComparableText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getDisplayName(profile) {
  if (!profile) {
    return '匿名用户';
  }
  return profile.username || `用户${profile.id.slice(-4)}`;
}

function isDuplicateTask(task, userId, payload) {
  return task.publisherId === userId &&
    task.status === TASK_STATUS.OPEN &&
    normalizeComparableText(task.title) === normalizeComparableText(payload.title) &&
    normalizeComparableText(task.description) === normalizeComparableText(payload.description) &&
    normalizeComparableText(task.pickupText) === normalizeComparableText(payload.pickupText) &&
    normalizeComparableText(task.deliveryText) === normalizeComparableText(payload.deliveryText);
}

async function enrichTask(task) {
  if (!task) {
    return null;
  }

  const [publisher, runner] = await Promise.all([
    task.publisherId ? findUserById(task.publisherId) : null,
    task.runnerId ? findUserById(task.runnerId) : null
  ]);

  return {
    ...task,
    publisherName: task.publisherName || getDisplayName(publisher),
    publisherAvatar: publisher?.avatar || '',
    runnerName: task.runnerName || getDisplayName(runner),
    runnerAvatar: runner?.avatar || ''
  };
}

async function finishTaskSettlement(task, incomeTitle = '任务完成收入', expenseTitle = '任务完成扣款结算') {
  const resolvedTask = task;
  const runner = await findUserById(resolvedTask.runnerId);
  if (runner) {
    const completedCount = (runner.completedCount || 0) + 1;
    await applyWalletDelta(runner.id, resolvedTask.price, {
      title: incomeTitle,
      type: 'income',
      persistSnapshot: false
    });
    await updateUser(runner.id, { completedCount });
  }

  const publisher = await findUserById(resolvedTask.publisherId);
  if (publisher) {
    const completedCount = (publisher.completedCount || 0) + 1;
    await updateUser(publisher.id, { completedCount });
    await createWalletFlow(publisher.id, expenseTitle, 'expense', 0, publisher.wallet, false);
  }
}

function resolveAppealAllocation(price, payload = {}) {
  const refundTo = payload.refundTo || 'publisher';
  if (!['publisher', 'runner', 'both'].includes(refundTo)) {
    throw new Error('退款方式不合法');
  }

  let publisherAmount;
  let runnerAmount;

  if (refundTo === 'publisher') {
    publisherAmount = price;
    runnerAmount = 0;
  } else if (refundTo === 'runner') {
    publisherAmount = 0;
    runnerAmount = price;
  } else {
    const publisherRaw = payload.publisherAmount ?? roundAmount(price / 2);
    const runnerRaw = payload.runnerAmount ?? roundAmount(price - Number(publisherRaw || 0));
    publisherAmount = roundAmount(publisherRaw);
    runnerAmount = roundAmount(runnerRaw);
  }

  if (!Number.isFinite(publisherAmount) || !Number.isFinite(runnerAmount) || publisherAmount < 0 || runnerAmount < 0) {
    throw new Error('积分分配金额不合法');
  }
  if (roundAmount(publisherAmount + runnerAmount) !== roundAmount(price)) {
    throw new Error('发布方与接单方分配金额之和必须等于订单金额');
  }

  return {
    refundTo,
    publisherAmount,
    runnerAmount
  };
}

async function findPendingAppealByTaskId(taskId) {
  const appeals = await listAppealRecordsByTaskId(taskId);
  return appeals.find((item) => item.status === 'pending') || null;
}

export async function listTasks(campus, category, sort = 'latest') {
  const tasks = await listTasksByFilters(campus, category, sort);
  return clone(await Promise.all(tasks.map((task) => enrichTask(task))));
}

export async function getTaskDetail(taskId) {
  return clone(await enrichTask(await findTaskById(taskId)));
}

export async function publishTask(userId, payload) {
  const profile = await getProfile(userId);
  if (!profile) {
    throw new Error('用户不存在');
  }

  const amount = roundAmount(payload.price || 0);
  validateSensitive(`${payload.title || ''} ${payload.description || ''}`);

  const duplicateTask = db.tasks.find((item) => isDuplicateTask(item, userId, payload));
  if (duplicateTask && !payload.forcePublish) {
    throw new Error('检测到相同内容的待接单任务，请确认是否继续发布');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('积分报价必须大于 0');
  }
  if (profile.wallet < amount) {
    throw new Error('钱包余额不足，请先充值');
  }

  await applyWalletDelta(userId, -amount, {
    title: '发布任务冻结积分',
    type: 'freeze',
    persistSnapshot: false
  });

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
    distanceText: payload.distanceText || '待计算位置服务',
    status: TASK_STATUS.OPEN,
    auditStatus: AUTO_APPROVE_TASKS ? 'approved' : 'pending',
    publisherId: profile.id,
    publisherName: getDisplayName(profile),
    images: Array.isArray(payload.images) ? payload.images : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    status: ORDER_STATUS.OPEN_WAITING,
    role: 'publisher',
    ownerRole: 'publisher',
    amount,
    withUser: '待接单',
    timeoutAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });
  await saveSnapshot(db);

  return clone(await enrichTask(task));
}

export async function acceptTask(userId, taskId) {
  const task = await findTaskById(taskId);
  const user = await getProfile(userId);

  if (!task || task.status !== TASK_STATUS.OPEN || task.auditStatus !== 'approved') {
    throw new Error('任务已不可接单');
  }
  if (task.publisherId === userId) {
    throw new Error('不能接自己发布的任务');
  }
  if (!user) {
    throw new Error('用户不存在');
  }

  if (isBlacklisted(task.publisherId, userId) || isBlacklisted(userId, task.publisherId)) {
    throw new Error('对方已在黑名单中，无法接单');
  }

  task.status = TASK_STATUS.ACCEPTED;
  task.runnerId = userId;
  task.runnerName = getDisplayName(user);
  task.updatedAt = new Date().toISOString();
  await updateTaskRecord(taskId, task);

  const timeoutAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  await createOrderRecord({
    id: generateId('order'),
    ownerUserId: userId,
    taskId,
    taskTitle: task.title,
    campus: task.campus,
    status: ORDER_STATUS.ACCEPTED,
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
      status: ORDER_STATUS.ACCEPTED,
      withUser: getDisplayName(user),
      timeoutAt,
      updatedAt: new Date().toISOString()
    });
  }

  await saveSnapshot(db);
  return clone(await enrichTask(task));
}

export async function cancelTask(userId, taskId) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }
  if (task.status !== TASK_STATUS.OPEN) {
    throw new Error('只能取消待接单的任务');
  }
  if (task.publisherId !== userId) {
    throw new Error('只有发布者可以取消任务');
  }

  const amount = roundAmount(task.price);
  const updatedAt = new Date().toISOString();
  await updateTaskRecord(taskId, { status: TASK_STATUS.CANCELLED, updatedAt });
  await updateOrdersByTaskId(taskId, {
    status: ORDER_STATUS.CANCELLED,
    updatedAt
  });
  await applyWalletDelta(userId, amount, {
    title: '取消任务退回积分',
    type: 'refund',
    persistSnapshot: false
  });

  task.status = TASK_STATUS.CANCELLED;
  task.updatedAt = updatedAt;
  await saveSnapshot(db);
  return clone(await enrichTask(task));
}

export async function listOrders(userId) {
  const orders = await Promise.all(
    (await listOrdersByUserId(userId)).map(async (item) => ({
      ...item,
      reviewed: Boolean(await findReviewByTaskAndFromUser(item.taskId, userId))
    }))
  );
  return clone(orders);
}

export async function updateTaskStatus(userId, taskId, nextStatus) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  if (!TASK_ALLOWED_TRANSITIONS[task.status] || !TASK_ALLOWED_TRANSITIONS[task.status].includes(nextStatus)) {
    throw new Error('当前状态不可流转');
  }

  if (RUNNER_ONLY_NEXT_STATUSES.includes(nextStatus) && task.runnerId !== userId) {
    throw new Error('只有接单者可以推进当前状态');
  }

  if (PUBLISHER_ONLY_NEXT_STATUSES.includes(nextStatus) && task.publisherId !== userId) {
    throw new Error('只有发布者可以完成验收');
  }

  task.status = nextStatus;
  task.updatedAt = new Date().toISOString();
  if (nextStatus === TASK_STATUS.CONFIRMING) {
    task.confirmingAt = task.updatedAt;
  }
  if (nextStatus === TASK_STATUS.FINISHED) {
    task.finishedAt = task.updatedAt;
  }
  await updateTaskRecord(taskId, task);
  await updateOrdersByTaskId(taskId, {
    status: nextStatus,
    updatedAt: task.updatedAt
  });

  if (nextStatus === TASK_STATUS.FINISHED) {
    await finishTaskSettlement(task);
  }

  await saveSnapshot(db);
  return clone(await enrichTask(task));
}

export async function createTaskReview(userId, taskId, payload) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.status !== TASK_STATUS.FINISHED) {
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

  await saveSnapshot(db);
  return clone(review);
}

export async function createTaskAppeal(userId, taskId, payload) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }
  if (!canAppealTaskStatus(task.status)) {
    throw new Error('当前任务状态不支持申诉');
  }

  const existingPendingAppeal = await findPendingAppealByTaskId(taskId);
  if (existingPendingAppeal) {
    throw new Error('该任务已有待处理申诉，请勿重复提交');
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

  const taskStatusBeforeAppeal = task.status;
  const appealTime = new Date().toISOString();
  await updateTaskRecord(taskId, {
    status: TASK_STATUS.APPEALING,
    updatedAt: appealTime
  });
  await updateOrdersByTaskId(taskId, {
    status: ORDER_STATUS.APPEALING,
    updatedAt: appealTime
  });

  const appeal = {
    id: generateId('appeal'),
    taskId,
    taskPrice: task.price,
    publisherId: task.publisherId,
    runnerId: task.runnerId,
    fromUserId: userId,
    fromRole: myOrder.role || myOrder.ownerRole,
    reason,
    detail,
    status: 'pending',
    taskStatusBeforeAppeal,
    createdAt: appealTime,
    updatedAt: appealTime
  };

  await createAppealRecord(appeal);
  await saveSnapshot(db);
  return clone(appeal);
}

export async function settleAppeal(appealId, payload = {}) {
  const normalizedPayload = typeof payload === 'string' ? { refundTo: payload } : (payload || {});
  const appeal = await findAppealRecordById(appealId);
  if (!appeal) {
    throw new Error('申诉工单不存在');
  }
  if (appeal.status !== 'pending') {
    throw new Error('该申诉已处理');
  }

  const task = await findTaskById(appeal.taskId);
  const price = roundAmount(task?.price || appeal.taskPrice || 0);
  const publisherId = task?.publisherId || appeal.publisherId;
  const runnerId = task?.runnerId || appeal.runnerId;
  const { refundTo, publisherAmount, runnerAmount } = resolveAppealAllocation(price, normalizedPayload);
  const wasFinished = (appeal.taskStatusBeforeAppeal || task?.status) === TASK_STATUS.FINISHED;

  if (wasFinished) {
    if (publisherAmount > 0 && publisherId && runnerId) {
      await applyWalletDelta(runnerId, -publisherAmount, {
        title: '申诉改判扣回积分',
        type: 'expense',
        allowNegative: true,
        persistSnapshot: false
      });
      await applyWalletDelta(publisherId, publisherAmount, {
        title: '申诉改判退回积分',
        type: 'refund',
        persistSnapshot: false
      });
    }
  } else {
    if (publisherAmount > 0 && publisherId) {
      await applyWalletDelta(publisherId, publisherAmount, {
        title: '申诉退回积分',
        type: 'refund',
        persistSnapshot: false
      });
    }
    if (runnerAmount > 0 && runnerId) {
      await applyWalletDelta(runnerId, runnerAmount, {
        title: '申诉判定结算',
        type: 'income',
        persistSnapshot: false
      });
    }
  }

  const resolvedAt = new Date().toISOString();
  const nextAppeal = await updateAppealRecord(appealId, {
    status: 'resolved',
    refundTo,
    publisherAmount,
    runnerAmount,
    resolvedAt,
    updatedAt: resolvedAt
  });

  if (task) {
    await updateTaskRecord(task.id, {
      status: TASK_STATUS.RESOLVED,
      updatedAt: resolvedAt,
      resolvedAt,
      appealResolvedAt: resolvedAt
    });
    await updateOrdersByTaskId(task.id, {
      status: ORDER_STATUS.RESOLVED,
      updatedAt: resolvedAt
    });
  }

  await saveSnapshot(db);
  return clone(nextAppeal || { ...appeal, status: 'resolved', refundTo, publisherAmount, runnerAmount, resolvedAt });
}

export async function rejectAppeal(appealId) {
  const appeal = await findAppealRecordById(appealId);
  if (!appeal) {
    throw new Error('申诉工单不存在');
  }
  if (appeal.status !== 'pending') {
    throw new Error('该申诉已处理');
  }

  const resolvedAt = new Date().toISOString();
  const nextAppeal = await updateAppealRecord(appealId, {
    status: 'rejected',
    resolvedAt,
    updatedAt: resolvedAt
  });

  const task = await findTaskById(appeal.taskId);
  const restoredStatus = appeal.taskStatusBeforeAppeal || TASK_STATUS.CONFIRMING;
  if (task) {
    await updateTaskRecord(task.id, {
      status: restoredStatus,
      updatedAt: resolvedAt
    });
    await updateOrdersByTaskId(task.id, {
      status: restoredStatus,
      updatedAt: resolvedAt
    });
  }

  await saveSnapshot(db);
  return clone(nextAppeal || { ...appeal, status: 'rejected', resolvedAt });
}

export async function listAppeals() {
  const appeals = await listAppealRecords();
  const enrichedAppeals = await Promise.all(appeals.map(async (item) => {
    const task = await findTaskById(item.taskId);
    const publisherId = task?.publisherId || item.publisherId;
    const runnerId = task?.runnerId || item.runnerId;
    const [fromUser, publisher, runner] = await Promise.all([
      findUserById(item.fromUserId),
      publisherId ? findUserById(publisherId) : null,
      runnerId ? findUserById(runnerId) : null
    ]);

    return {
      ...item,
      taskTitle: task ? task.title : '订单任务',
      taskPrice: task ? task.price : item.taskPrice || 0,
      taskStatus: task?.status || item.taskStatusBeforeAppeal || TASK_STATUS.APPEALING,
      publisherId,
      runnerId,
      publisherName: publisher ? publisher.username : '发布方',
      runnerName: runner ? runner.username : '接单方',
      fromUserName: fromUser ? fromUser.username : '匿名同学'
    };
  }));

  return clone(enrichedAppeals);
}

export async function handleAppeal(appealId, status) {
  if (status === 'rejected') {
    return rejectAppeal(appealId);
  }
  if (status === 'resolved') {
    return settleAppeal(appealId, 'publisher');
  }

  throw new Error('处理结果不合法');
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
  task.updatedAt = new Date().toISOString();
  await updateTaskRecord(taskId, { auditStatus: 'approved', updatedAt: task.updatedAt });
  if (log) {
    log.status = 'approved';
  }
  await saveSnapshot(db);
  return clone(await enrichTask(task));
}
