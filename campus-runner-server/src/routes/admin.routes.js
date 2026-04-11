import express from 'express';

import { approveTask, handleAppeal, listAppeals, listModerationLogs } from '../services/task.service.js';
import { adminLogin, adminLogout, requireAdmin, verifyAdminToken } from '../services/admin-auth.service.js';
import {
  addSensitiveWord,
  listSensitiveWords,
  removeSensitiveWord,
  removeTaskByAdmin
} from '../services/moderation.service.js';
import { db } from '../data/store.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { createWalletFlowRecord } from '../repositories/wallet.repository.js';

const router = express.Router();

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

/* ── Auth ── */
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

/* ── Admin middleware ── */
router.use('/admin', (req, res, next) => {
  try {
    requireAdmin(req);
    next();
  } catch (error) {
    next(error);
  }
});

/* ── Dashboard Statistics ── */
router.get('/admin/stats', (req, res) => {
  const users = db.users || [];
  const tasks = db.tasks || [];
  const orders = db.orders || [];
  const appeals = db.appeals || [];
  const withdrawRequests = db.withdrawRequests || [];
  const walletFlows = db.walletFlows || [];

  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const openTasks = tasks.filter(t => t.status === 'open').length;
  const acceptedTasks = tasks.filter(t => t.status === 'accepted').length;
  const runningTasks = tasks.filter(t => t.status === 'running').length;
  const finishedTasks = tasks.filter(t => t.status === 'finished').length;
  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;
  const pendingWithdrawals = withdrawRequests.filter(w => w.status === 'pending').length;
  const totalRevenue = walletFlows
    .filter(f => f.type === 'freeze')
    .reduce((sum, f) => sum + Math.abs(f.amount), 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTasks = tasks.filter(t => new Date(t.createdAt) >= todayStart).length;
  const todayUsers = users.filter(u => new Date(u.createdAt || Date.now()) >= todayStart).length;

  res.json({
    data: {
      totalUsers,
      totalTasks,
      openTasks,
      acceptedTasks,
      runningTasks,
      finishedTasks,
      pendingAppeals,
      pendingWithdrawals,
      totalRevenue,
      todayTasks,
      todayUsers,
      totalOrders: orders.length
    }
  });
});

/* ── User Management ── */
router.get('/admin/users', (req, res) => {
  const keyword = String(req.query.keyword || '').trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  let users = clone(db.users || []);
  if (keyword) {
    users = users.filter(u =>
      (u.nickname || '').toLowerCase().includes(keyword) ||
      (u.username || '').toLowerCase().includes(keyword) ||
      (u.id || '').toLowerCase().includes(keyword)
    );
  }

  const total = users.length;
  const list = users.slice((page - 1) * pageSize, page * pageSize).map(u => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    avatar: u.avatar,
    campus: u.campus,
    verified: u.verified,
    authStatus: u.authStatus,
    rating: u.rating,
    completedCount: u.completedCount,
    wallet: u.wallet,
    banned: Boolean(u.banned),
    createdAt: u.createdAt
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

/* ── Task Management ── */
router.get('/admin/tasks', (req, res) => {
  const status = req.query.status;
  const keyword = String(req.query.keyword || '').trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  let tasks = clone(db.tasks || []);
  if (status && status !== 'all') {
    tasks = tasks.filter(t => t.status === status);
  }
  if (keyword) {
    tasks = tasks.filter(t =>
      (t.title || '').toLowerCase().includes(keyword) ||
      (t.id || '').toLowerCase().includes(keyword) ||
      (t.publisherName || '').toLowerCase().includes(keyword)
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

/* ── Order Management ── */
router.get('/admin/orders', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  const orders = clone(db.orders || []);
  const total = orders.length;
  const list = orders.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

/* ── Wallet / Financial ── */
router.get('/admin/wallet/flows', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  const flows = clone(db.walletFlows || []).map(f => {
    const user = (db.users || []).find(u => u.id === f.userId);
    return { ...f, nickname: user ? user.nickname : '未知用户' };
  });
  const total = flows.length;
  const list = flows.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

/* ── Withdrawal Requests ── */
router.get('/admin/withdrawals', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

  const withdrawals = clone(db.withdrawRequests || []).map(w => {
    const user = (db.users || []).find(u => u.id === w.userId);
    return { ...w, nickname: user ? user.nickname : '未知用户' };
  });
  const total = withdrawals.length;
  const list = withdrawals.slice((page - 1) * pageSize, page * pageSize);

  res.json({ data: { list, total, page, pageSize } });
});

router.post('/admin/withdrawals/:id/approve', async (req, res, next) => {
  try {
    const w = (db.withdrawRequests || []).find(item => item.id === req.params.id);
    if (!w) throw new Error('提现申请不存在');
    if (w.status !== 'pending') throw new Error('该申请已处理');
    w.status = 'approved';
    res.json({ data: true, message: '提现已批准' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/withdrawals/:id/reject', async (req, res, next) => {
  try {
    const w = (db.withdrawRequests || []).find(item => item.id === req.params.id);
    if (!w) throw new Error('提现申请不存在');
    if (w.status !== 'pending') throw new Error('该申请已处理');
    w.status = 'rejected';

    const user = await findUserById(w.userId);
    if (user) {
      user.wallet += w.amount;
      await updateUser(w.userId, { wallet: user.wallet });
      await createWalletFlowRecord({
        id: `wf_refund_${Date.now()}`,
        userId: w.userId,
        title: '提现被驳回，退款',
        type: 'refund',
        amount: w.amount,
        balanceAfter: user.wallet,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ data: true, message: '提现已驳回并退款' });
  } catch (error) {
    next(error);
  }
});

/* ── Moderation ── */
router.get('/admin/moderation', (req, res) => {
  res.json({ data: listModerationLogs() });
});

router.get('/admin/sensitive-words', (req, res) => {
  res.json({ data: listSensitiveWords() });
});

router.post('/admin/sensitive-words', (req, res, next) => {
  try {
    const data = addSensitiveWord(req.body.word);
    res.status(201).json({ data, message: '敏感词已添加' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/sensitive-words/remove', (req, res, next) => {
  try {
    const data = removeSensitiveWord(req.body.word);
    res.json({ data, message: '敏感词已删除' });
  } catch (error) {
    next(error);
  }
});

/* ── Appeals ── */
router.get('/admin/appeals', async (req, res, next) => {
  try {
    res.json({ data: await listAppeals() });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/appeals/:id/resolve', async (req, res, next) => {
  try {
    const data = await handleAppeal(req.params.id, 'resolved');
    res.json({ data, message: '申诉已处理' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/appeals/:id/reject', async (req, res, next) => {
  try {
    const data = await handleAppeal(req.params.id, 'rejected');
    res.json({ data, message: '申诉已驳回' });
  } catch (error) {
    next(error);
  }
});

export default router;
