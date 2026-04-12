import express from 'express';

import { requireUser } from '../services/auth.service.js';
import { addToBlacklist, getBlacklist, removeFromBlacklist, sendTip } from '../services/social.service.js';
import { db } from '../data/store.js';

const router = express.Router();

router.get('/blacklist', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    res.json({ data: getBlacklist(user.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/blacklist/add', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await addToBlacklist(user.id, req.body.userId);
    res.json({ data, message: '已加入黑名单' });
  } catch (error) {
    next(error);
  }
});

router.post('/blacklist/remove', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await removeFromBlacklist(user.id, req.body.userId);
    res.json({ data, message: '已移出黑名单' });
  } catch (error) {
    next(error);
  }
});

router.post('/tip', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await sendTip(user.id, req.body.toUserId, req.body.amount);
    res.status(201).json({ data, message: '打赏成功' });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId/reviews', async (req, res, next) => {
  try {
    const reviews = (db.reviews || []).filter((item) => item.toUserId === req.params.userId);
    const enriched = reviews.map((item) => {
      const from = db.users.find((user) => user.id === item.fromUserId);
      return {
        ...item,
        fromUserName: from?.username || '匿名',
        fromUserAvatar: from?.avatar || ''
      };
    });
    res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
});

export default router;
