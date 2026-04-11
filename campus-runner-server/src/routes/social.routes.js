import express from 'express';
import { requireUser } from '../services/auth.service.js';
import { addToBlacklist, removeFromBlacklist, getBlacklist, sendTip } from '../services/social.service.js';
import { db } from '../data/store.js';

const router = express.Router();

// Blacklist
router.get('/blacklist', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    res.json({ data: getBlacklist(user.id) });
  } catch (e) { next(e); }
});

router.post('/blacklist/add', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = addToBlacklist(user.id, req.body.userId);
    res.json({ data, message: '已加入黑名单' });
  } catch (e) { next(e); }
});

router.post('/blacklist/remove', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = removeFromBlacklist(user.id, req.body.userId);
    res.json({ data, message: '已移出黑名单' });
  } catch (e) { next(e); }
});

// Tips
router.post('/tip', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = sendTip(user.id, req.body.toUserId, req.body.amount);
    res.status(201).json({ data, message: '打赏成功' });
  } catch (e) { next(e); }
});

// Reviews for a user (public)
router.get('/users/:userId/reviews', async (req, res, next) => {
  try {
    const reviews = (db.reviews || []).filter(r => r.toUserId === req.params.userId);
    const enriched = reviews.map(r => {
      const from = db.users.find(u => u.id === r.fromUserId);
      return { ...r, fromNickname: from?.nickname || '匿名' };
    });
    res.json({ data: enriched });
  } catch (e) { next(e); }
});

export default router;
