import express from 'express';

import {
  acceptTask,
  cancelTaskAppeal,
  cancelTask,
  createTaskAppeal,
  createTaskReview,
  getTaskDetail,
  listOrders,
  listTasks,
  publishTask,
  updateTaskStatus
} from '../services/task.service.js';
import { requireUser } from '../services/auth.service.js';

const router = express.Router();

router.get('/tasks', async (req, res, next) => {
  try {
    const data = await listTasks(req.query.campus || '东方红校区', req.query.category, req.query.sort);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/tasks/:id', async (req, res, next) => {
  try {
    const data = await getTaskDetail(req.params.id);
    if (!data) {
      res.status(404).json({ message: '任务不存在' });
      return;
    }
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await publishTask(user.id, req.body || {});
    res.status(201).json({ data, message: '任务已发布，等待审核' });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/accept', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await acceptTask(user.id, req.params.id);
    res.json({ data, message: '接单成功' });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/cancel', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await cancelTask(user.id, req.params.id);
    res.json({ data, message: '任务已取消，积分已退回' });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await listOrders(user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/status', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await updateTaskStatus(user.id, req.params.id, req.body.status);
    res.json({ data, message: '订单状态已更新' });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/review', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await createTaskReview(user.id, req.params.id, req.body || {});
    res.status(201).json({ data, message: '评价已提交' });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/appeal', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await createTaskAppeal(user.id, req.params.id, req.body || {});
    res.status(201).json({ data, message: '申诉已提交' });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/appeal/cancel', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await cancelTaskAppeal(user.id, req.params.id);
    res.json({ data, message: '申诉已取消' });
  } catch (error) {
    next(error);
  }
});

export default router;
