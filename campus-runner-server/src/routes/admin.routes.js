import express from 'express';

import { approveTask, listAppeals, listModerationLogs, rejectAppeal, settleAppeal } from '../services/task.service.js';
import { adminLogin, adminLogout, requireAdmin, verifyAdminToken } from '../services/admin-auth.service.js';
import {
  addSensitiveWord,
  listSensitiveWords,
  removeSensitiveWord,
  removeTaskByAdmin
} from '../services/moderation.service.js';
import { db } from '../data/store.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { applyWalletDelta, roundAmount } from '../services/profile.service.js';
import { saveSnapshot } from '../lib/file-persist.js';
import { TASK_STATUS } from '../lib/task-status.js';

const router = express.Router();

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

router.post('/admin/login', (req, res, next) => {
  try {
    const data = adminLogin(req.body.username, req.body.password);
    res.json({ data, message: '登录成功' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/logout', (req, res, next) => {
  try {
    requireAdmin(req);
    adminLogout(req.headers.authorization?.replace('Bearer ', '') || '');
    res.json({ data: true, message: '已退出登录' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/session', (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const admin = verifyAdminToken(token);
    if (!admin) {
      res.status(401).json({ message: '管理员登录已过期' });
      return;
    }
    res.json({ data: admin });
  } catch (error) {
    next(error);
  }
});

router.use('/admin', (req, res, next) => {
  try {
    requireAdmin(req);
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/admin/stats', (req, res) => {
  const users = db.users || [];
  const tasks = db.tasks || [];
  const orders = db.orders || [];
  const appeals = db.appeals || [];
  const withdrawRequests = db.withdrawRequests || [];
  const walletFlows = db.walletFlows || [];
  const settledStatuses = [TASK_STATUS.FINISHED, TASK_STATUS.RESOLVED];
  const settledTasks = tasks.filter((item) => settledStatuses.includes(item.status));

  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const openTasks = tasks.filter((item) => item.status === TASK_STATUS.OPEN).length;
  const acceptedTasks = tasks.filter((item) => item.status === TASK_STATUS.ACCEPTED).length;
  const runningTasks = tasks.filter((item) => item.status === TASK_STATUS.RUNNING).length;
  const finishedTasks = tasks.filter((item) => item.status === TASK_STATUS.FINISHED).length;
  const resolvedTasks = tasks.filter((item) => item.status === TASK_STATUS.RESOLVED).length;
  const pendingAppeals = appeals.filter((item) => item.status === 'pending').length;
  const pendingWithdrawals = withdrawRequests.filter((item) => item.status === 'pending').length;
  const totalRevenue = walletFlows
    .filter((item) => item.type === 'freeze')
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const totalTurnover = roundAmount(
    settledTasks.reduce((sum, item) => sum + Number(item.price || 0), 0)
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTasks = tasks.filter((item) => new Date(item.createdAt) >= todayStart).length;
  const todayUsers = users.filter((item) => new Date(item.createdAt || Date.now()) >= todayStart).length;
  const averageOrderAmount = settledTasks.length > 0 ? roundAmount(totalTurnover / settledTasks.length) : 0;

  const recentTurnover = Array.from({ length: 7 }, (_, index) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (6 - index));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const dayTasks = settledTasks.filter((item) => {
      const point = new Date(item.finishedAt || item.resolvedAt || item.updatedAt || item.createdAt);
      return point >= start && point < end;
    });

    return {
      date: start.toISOString().slice(0, 10),
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      count: dayTasks.length,
      amount: roundAmount(dayTasks.reduce((sum, item) => sum + Number(item.price || 0), 0))
    };
  });

  const categoryStats = Object.entries(
    tasks.reduce((accumulator, item) => {
      accumulator[item.category || '其他'] = (accumulator[item.category || '其他'] || 0) + 1;
      return accumulator;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const campusStats = Object.entries(
    tasks.reduce((accumulator, item) => {
      accumulator[item.campus || '未知校区'] = (accumulator[item.campus || '未知校区'] || 0) + 1;
      return accumulator;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);

  res.json({
    data: {
      totalUsers,
      totalTasks,
      openTasks,
      acceptedTasks,
      runningTasks,
      finishedTasks,
      resolvedTasks,
      pendingAppeals,
      pendingWithdrawals,
      totalRevenue,
      totalTurnover,
      todayTasks,
      todayUsers,
      totalOrders: orders.length,
      averageOrderAmount,
      recentTurnover,
      categoryStats,
      campusStats
    }
  });
});

router.get('/admin/users', (req, res) => {
  const keyword = String(req.query.keyword || '').trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  let users = clone(db.users || []);
  if (keyword) {
    users = users.filter((item) =>
      (item.username || '').toLowerCase().includes(keyword) ||
      (item.id || '').toLowerCase().includes(keyword)
    );
  }

  const total = users.length;
  const list = users.slice((page - 1) * pageSize, page * pageSize).map((item) => ({
    id: item.id,
    username: item.username,
    avatar: item.avatar,
    campus: item.campus,
    verified: item.verified,
    authStatus: item.authStatus,
    rating: item.rating,
    completedCount: item.completedCount,
    wallet: item.wallet,
    banned: Boolean(item.banned),
    createdAt: item.createdAt
  }));

  res.json({ data: { list, total, page, pageSize } });
});

router.post('/admin/users/:id/ban', async (req, res, next) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) throw new Error('用户不存在');
    await updateUser(req.params.id, { banned: true });
    res.json({ data: true, message: '用户已封禁' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users/:id/unban', async (req, res, next) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) throw new Error('用户不存在');
    await updateUser(req.params.id, { banned: false });
    res.json({ data: true, message: '用户已解封' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/tasks', (req, res) => {
  const status = req.query.status;
  const keyword = String(req.query.keyword || '').trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  let tasks = clone(db.tasks || []);
  if (status && status !== 'all') {
    tasks = tasks.filter((item) => item.status === status);
  }
  if (keyword) {
    tasks = tasks.filter((item) =>
      (item.title || '').toLowerCase().includes(keyword) ||
      (item.id || '').toLowerCase().includes(keyword) ||
      (item.publisherName || '').toLowerCase().includes(keyword)
    );
  }

  const total = tasks.length;
  const list = tasks.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

router.post('/admin/tasks/:id/approve', async (req, res, next) => {
  try {
    const data = await approveTask(req.params.id);
    res.json({ data, message: '审核通过' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/tasks/:id/remove', async (req, res, next) => {
  try {
    const data = await removeTaskByAdmin(req.params.id);
    res.json({ data, message: '任务已删除' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  const orders = clone(db.orders || []);
  const total = orders.length;
  const list = orders.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

router.get('/admin/wallet/flows', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  const flows = clone(db.walletFlows || []).map((item) => {
    const user = (db.users || []).find((userItem) => userItem.id === item.userId);
    return { ...item, userName: user ? user.username : '未知用户', userAvatar: user?.avatar || '' };
  });
  const total = flows.length;
  const list = flows.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

router.get('/admin/withdrawals', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  const withdrawals = clone(db.withdrawRequests || []).map((item) => {
    const user = (db.users || []).find((userItem) => userItem.id === item.userId);
    return { ...item, userName: user ? user.username : '未知用户', userAvatar: user?.avatar || '' };
  });
  const total = withdrawals.length;
  const list = withdrawals.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

router.post('/admin/withdrawals/:id/approve', async (req, res, next) => {
  try {
    const request = (db.withdrawRequests || []).find((item) => item.id === req.params.id);
    if (!request) throw new Error('提现申请不存在');
    if (request.status !== 'pending') throw new Error('该申请已处理');

    request.status = 'approved';
    request.updatedAt = new Date().toISOString();
    await saveSnapshot(db);
    res.json({ data: true, message: '提现已批准' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/withdrawals/:id/reject', async (req, res, next) => {
  try {
    const request = (db.withdrawRequests || []).find((item) => item.id === req.params.id);
    if (!request) throw new Error('提现申请不存在');
    if (request.status !== 'pending') throw new Error('该申请已处理');

    request.status = 'rejected';
    request.updatedAt = new Date().toISOString();
    await applyWalletDelta(request.userId, roundAmount(request.amount), {
      title: '提现驳回退款',
      type: 'refund',
      persistSnapshot: false
    });
    await saveSnapshot(db);

    res.json({ data: true, message: '提现已驳回并退款' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/moderation', (req, res) => {
  res.json({ data: listModerationLogs() });
});

router.get('/admin/sensitive-words', (req, res) => {
  res.json({ data: listSensitiveWords() });
});

router.post('/admin/sensitive-words', async (req, res, next) => {
  try {
    const word = req.body && Object.prototype.hasOwnProperty.call(req.body, 'word') ? req.body.word : '';
    const data = await addSensitiveWord(word);
    res.status(201).json({ data, message: '敏感词已添加' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/sensitive-words/remove', async (req, res, next) => {
  try {
    const word = req.body && Object.prototype.hasOwnProperty.call(req.body, 'word') ? req.body.word : '';
    const data = await removeSensitiveWord(word);
    res.json({ data, message: '敏感词已删除' });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/appeals', async (req, res, next) => {
  try {
    res.json({ data: await listAppeals() });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/appeals/:id/settle', async (req, res, next) => {
  try {
    const admin = requireAdmin(req);
    const data = await settleAppeal(req.params.id, {
      ...(req.body || {}),
      decisionBy: admin.name || admin.username
    });
    res.json({ data, message: '申诉已处理并退款' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/appeals/:id/resolve', async (req, res, next) => {
  try {
    const admin = requireAdmin(req);
    const data = await settleAppeal(req.params.id, {
      ...(req.body || {}),
      decisionBy: admin.name || admin.username
    });
    res.json({ data, message: '申诉已处理并退款' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/appeals/:id/reject', async (req, res, next) => {
  try {
    const data = await rejectAppeal(req.params.id);
    res.json({ data, message: '申诉已驳回' });
  } catch (error) {
    next(error);
  }
});

export default router;
