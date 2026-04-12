import express from 'express';

import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
import { createMessage, findOrCreateRoom, listMessagesByRoom, listRoomsByUser } from '../repositories/chat.repository.js';
import { findTaskById } from '../repositories/task.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { requireUser } from '../services/auth.service.js';
import { isBlacklisted } from '../services/social.service.js';

const router = express.Router();

function getUnreadCountForRoom(room, userId) {
  const lastRead = room.lastReadBy?.[userId];
  return db.chatMessages.filter((message) => {
    if (message.roomId !== room.id || message.fromUserId === userId) {
      return false;
    }
    if (!lastRead) {
      return true;
    }
    return new Date(message.createdAt) > new Date(lastRead);
  }).length;
}

router.get('/chat/rooms', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const rooms = listRoomsByUser(user.id);
    const enriched = await Promise.all(rooms.map(async (room) => {
      const otherUserId = room.participants.find((participantId) => participantId !== user.id);
      const [otherUser, task] = await Promise.all([
        otherUserId ? findUserById(otherUserId) : null,
        findTaskById(room.taskId)
      ]);

      return {
        ...room,
        otherUserId,
        otherName: otherUser?.username || '未知用户',
        otherAvatar: otherUser?.avatar || '',
        taskTitle: task?.title || '任务',
        unreadCount: getUnreadCountForRoom(room, user.id)
      };
    }));
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
    if (isBlacklisted(user.id, otherId) || isBlacklisted(otherId, user.id)) {
      return res.status(403).json({ message: '对方已在黑名单中，无法创建会话' });
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
    const room = db.chatRooms.find((item) => item.id === req.params.roomId);
    if (!room || !room.participants.includes(user.id)) {
      return res.status(403).json({ message: '无权访问此会话' });
    }

    const messages = listMessagesByRoom(req.params.roomId);
    const enriched = await Promise.all(messages.map(async (message) => {
      const sender = await findUserById(message.fromUserId);
      return {
        ...message,
        senderName: sender?.username || '未知用户',
        senderAvatar: sender?.avatar || ''
      };
    }));

    res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const room = db.chatRooms.find((item) => item.id === req.params.roomId);
    if (!room || !room.participants.includes(user.id)) {
      return res.status(403).json({ message: '无权发送消息' });
    }

    const otherUserId = room.participants.find((participantId) => participantId !== user.id);
    if (otherUserId && (isBlacklisted(user.id, otherUserId) || isBlacklisted(otherUserId, user.id))) {
      return res.status(403).json({ message: '对方已在黑名单中，无法发送消息' });
    }

    const content = String(req.body?.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: '消息不能为空' });
    }

    const type = String(req.body?.type || 'text').trim();
    const message = createMessage(req.params.roomId, user.id, content, type);
    res.status(201).json({
      data: {
        ...message,
        senderName: user.username,
        senderAvatar: user.avatar || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/chat/unread-count', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const rooms = listRoomsByUser(user.id);
    const totalUnread = rooms.reduce((sum, room) => sum + getUnreadCountForRoom(room, user.id), 0);
    res.json({ data: totalUnread });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/rooms/:roomId/read', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const room = db.chatRooms.find((item) => item.id === req.params.roomId);
    if (!room || !room.participants.includes(user.id)) {
      return res.status(403).json({ message: '无权操作' });
    }

    if (!room.lastReadBy) {
      room.lastReadBy = {};
    }
    room.lastReadBy[user.id] = new Date().toISOString();
    await saveSnapshot(db);
    res.json({ data: true });
  } catch (error) {
    next(error);
  }
});

export default router;
