import express from 'express';

import { approveTask, handleAppeal, listAppeals, listModerationLogs } from '../services/task.service.js';
import { adminLogin, adminLogout, requireAdmin, verifyAdminToken } from '../services/admin-auth.service.js';
import {
  addSensitiveWord,
  listSensitiveWords,
  removeSensitiveWord,
  removeTaskByAdmin
} from '../services/moderation.service.js';

const router = express.Router();

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
