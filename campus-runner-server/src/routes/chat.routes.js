import express from 'express';

import { requireUser } from '../services/auth.service.js';
import { findOrCreateRoom, createMessage, listMessagesByRoom, listRoomsByUser } from '../repositories/chat.repository.js';
import { findTaskById } from '../repositories/task.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { db } from '../data/store.js';

const router = express.Router();

router.get('/chat/rooms', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const rooms = listRoomsByUser(user.id);
    const enriched = rooms.map((room) => {
      const otherId = room.participants.find((p) => p !== user.id);
      const other = db.users.find((u) => u.id === otherId);
      const task = db.tasks.find((t) => t.id === room.taskId);
      return {
        ...room,
        otherNickname: other?.nickname || '未知用户',
        taskTitle: task?.title || '任务'
      };
    });
    res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/rooms', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const { taskId } = req.body || {};
    const task = await findTaskById(taskId);
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    const otherId = task.publisherId === user.id ? task.runnerId : task.publisherId;
    if (!otherId) {
      return res.status(400).json({ message: '对方用户不存在' });
    }
    const room = findOrCreateRoom(taskId, user.id, otherId);
    res.json({ data: room });
  } catch (error) {
    next(error);
  }
});

router.get('/chat/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const room = db.chatRooms.find((r) => r.id === req.params.roomId);
    if (!room || !room.participants.includes(user.id)) {
      return res.status(403).json({ message: '无权访问此会话' });
    }
    const messages = listMessagesByRoom(req.params.roomId);
    const enriched = messages.map((m) => {
      const sender = db.users.find((u) => u.id === m.fromUserId);
      return { ...m, senderNickname: sender?.nickname || '未知用户' };
    });
    res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const room = db.chatRooms.find((r) => r.id === req.params.roomId);
    if (!room || !room.participants.includes(user.id)) {
      return res.status(403).json({ message: '无权发送消息' });
    }
    const content = String(req.body?.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: '消息不能为空' });
    }
    const type = String(req.body?.type || 'text').trim();
    const msg = createMessage(req.params.roomId, user.id, content, type);
    res.status(201).json({ data: { ...msg, senderNickname: user.nickname } });
  } catch (error) {
    next(error);
  }
});

export default router;
