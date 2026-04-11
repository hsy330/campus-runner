import { db, generateId } from '../data/store.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { createWalletFlowRecord, listWalletFlowsByUserId } from '../repositories/wallet.repository.js';
import { listTasksByPublisherId } from '../repositories/task.repository.js';
import { listReviewsByFromUserId, listReviewsByToUserId } from '../repositories/review.repository.js';

export async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    nickname: user.nickname,
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
        fromUserName: fromUser ? fromUser.nickname : '匿名同学',
        taskTitle: task ? task.title : '订单任务'
      };
    });
  const myReviews = (await listReviewsByFromUserId(userId))
    .map((item) => {
      const toUser = allUsers.find((user) => user.id === item.toUserId);
      const task = allTasks.find((taskItem) => taskItem.id === item.taskId);
      return {
        ...item,
        toUserName: toUser ? toUser.nickname : '对方同学',
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

export async function createWithdrawRequest(amount, userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  if (amount <= 0) {
    throw new Error('提现金额必须大于 0');
  }
  
  if (user.wallet < amount) {
    throw new Error('余额不足');
  }
  
  user.wallet -= amount;
  await updateUser(userId, { wallet: user.wallet });
  
  const request = {
    id: generateId('withdraw'),
    userId,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  db.withdrawRequests.push(request);
  
  await createWalletFlowRecord({
    id: generateId('wf'),
    userId,
    title: '申请提现',
    type: 'withdraw',
    amount: -amount,
    balanceAfter: user.wallet,
    createdAt: new Date().toISOString()
  });
  
  return request;
}

export async function createRecharge(amount, userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('充值金额必须大于 0');
  }

  user.wallet += value;
  await updateUser(userId, { wallet: user.wallet });

  const flow = {
    id: generateId('recharge'),
    userId,
    amount: value,
    status: 'success',
    createdAt: new Date().toISOString()
  };

  await createWalletFlowRecord({
    id: generateId('wf'),
    userId,
    title: '钱包充值',
    type: 'recharge',
    amount: value,
    balanceAfter: user.wallet,
    createdAt: new Date().toISOString()
  });

  return flow;
}

export async function createWalletFlow(userId, title, type, amount, balanceAfter) {
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
  return flow;
}

export function getCurrentUserId() {
  return 'u_self';
}
