import { db, generateId } from '../data/store.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { createWalletFlowRecord, listWalletFlowsByUserId } from '../repositories/wallet.repository.js';
import { listTasksByPublisherId } from '../repositories/task.repository.js';
import { listReviewsByFromUserId, listReviewsByToUserId } from '../repositories/review.repository.js';
import { saveSnapshot } from '../lib/file-persist.js';

export function roundAmount(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    campus: user.campus,
    verified: user.verified,
    authStatus: user.authStatus,
    realName: user.realName,
    studentNo: user.studentNo,
    rating: user.rating,
    completedCount: user.completedCount,
    wallet: user.wallet,
    score: user.score
  };
}

export async function getProfileBundle(userId) {
  const profile = (await getProfile(userId)) || db.users[0];
  const walletFlows = await listWalletFlowsByUserId(userId);
  const publishedTasks = await listTasksByPublisherId(userId);
  const allUsers = db.users;
  const allTasks = db.tasks;
  const receivedReviews = (await listReviewsByToUserId(userId))
    .map((item) => {
      const fromUser = allUsers.find((user) => user.id === item.fromUserId);
      const task = publishedTasks.find((taskItem) => taskItem.id === item.taskId) || allTasks.find((taskItem) => taskItem.id === item.taskId);
      return {
        ...item,
        fromUserName: fromUser ? fromUser.username : '匿名同学',
        fromUserAvatar: fromUser?.avatar || '',
        taskTitle: task ? task.title : '订单任务'
      };
    });
  const myReviews = (await listReviewsByFromUserId(userId))
    .map((item) => {
      const toUser = allUsers.find((user) => user.id === item.toUserId);
      const task = allTasks.find((taskItem) => taskItem.id === item.taskId);
      return {
        ...item,
        toUserName: toUser ? toUser.username : '对方同学',
        toUserAvatar: toUser?.avatar || '',
        taskTitle: task ? task.title : '订单任务'
      };
    });

  return {
    profile,
    walletFlows,
    publishedTasks,
    receivedReviews,
    myReviews
  };
}

export async function getPublicProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    campus: user.campus,
    verified: user.verified,
    rating: user.rating,
    completedCount: user.completedCount,
    score: user.score
  };
}

export async function createWithdrawRequest(amount, userId) {
  const value = roundAmount(amount);
  if (value <= 0) {
    throw new Error('提现金额必须大于 0');
  }

  await applyWalletDelta(userId, -value, {
    title: '申请提现',
    type: 'withdraw',
    persistSnapshot: false
  });

  const request = {
    id: generateId('withdraw'),
    userId,
    amount: value,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.withdrawRequests.unshift(request);
  await saveSnapshot(db);

  return request;
}

export async function createRecharge(amount, userId) {
  const value = roundAmount(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('充值金额必须大于 0');
  }

  await applyWalletDelta(userId, value, {
    title: '钱包充值',
    type: 'recharge',
    persistSnapshot: false
  });

  const flow = {
    id: generateId('recharge'),
    userId,
    amount: value,
    status: 'success',
    createdAt: new Date().toISOString()
  };
  await saveSnapshot(db);

  return flow;
}

export async function createWalletFlow(userId, title, type, amount, balanceAfter, persistSnapshot = true) {
  const flow = {
    id: generateId('wf'),
    userId,
    title,
    type,
    amount,
    balanceAfter,
    createdAt: new Date().toISOString()
  };
  await createWalletFlowRecord(flow);
  if (persistSnapshot) {
    await saveSnapshot(db);
  }
  return flow;
}

export async function applyWalletDelta(userId, delta, options = {}) {
  const {
    title = '',
    type = '',
    allowNegative = false,
    persistSnapshot = true
  } = options;
  const value = roundAmount(delta);

  if (!Number.isFinite(value) || value === 0) {
    throw new Error('钱包变动金额不合法');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const nextWallet = roundAmount((user.wallet || 0) + value);
  if (!allowNegative && nextWallet < 0) {
    throw new Error('余额不足');
  }

  await updateUser(userId, { wallet: nextWallet });
  const nextUser = { ...user, wallet: nextWallet };

  let flow = null;
  if (title && type) {
    flow = await createWalletFlow(userId, title, type, value, nextWallet, false);
  }

  if (persistSnapshot) {
    await saveSnapshot(db);
  }

  return { user: nextUser, flow };
}

export function getCurrentUserId() {
  return 'u_self';
}
