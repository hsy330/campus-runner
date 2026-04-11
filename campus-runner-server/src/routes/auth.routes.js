import express from 'express';

import { loginWithPassword, registerWithPassword, requireUser, verifyToken, updateUserProfile } from '../services/auth.service.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const result = await registerWithPassword(req.body || {});
    res.status(201).json({ data: result, message: '注册成功' });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await loginWithPassword(req.body.username, req.body.password);
    res.json({ data: result, message: '登录成功' });
  } catch (error) {
    next(error);
  }
});

router.get('/verify', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await verifyToken(token);
    if (!user) {
      return res.status(401).json({ error: '登录已过期' });
    }

    res.json({
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        campus: user.campus,
        verified: user.verified,
        authStatus: user.authStatus,
        realName: user.realName || '',
        studentNo: user.studentNo || '',
        wallet: user.wallet,
        rating: user.rating || 0,
        completedCount: user.completedCount || 0,
        score: user.score || 100
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const updated = await updateUserProfile(user.id, req.body || {});
    res.json({
      data: {
        id: updated.id,
        username: updated.username,
        nickname: updated.nickname,
        avatar: updated.avatar,
        campus: updated.campus,
        verified: updated.verified,
        authStatus: updated.authStatus,
        realName: updated.realName || '',
        studentNo: updated.studentNo || '',
        wallet: updated.wallet,
        rating: updated.rating || 0,
        completedCount: updated.completedCount || 0,
        score: updated.score || 100
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
