import express from 'express';

import {
  createRecharge,
  createWithdrawRequest,
  getProfileBundle,
  getPublicProfile
} from '../services/profile.service.js';
import { requireUser } from '../services/auth.service.js';

const router = express.Router();

router.get('/profile/bundle', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    res.json({ data: await getProfileBundle(user.id) });
  } catch (error) {
    next(error);
  }
});

router.get('/profile/:userId', async (req, res, next) => {
  try {
    const data = await getPublicProfile(req.params.userId);
    if (!data) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/wallet/withdraw', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await createWithdrawRequest(req.body.amount, user.id);
    res.status(201).json({ data, message: '提现申请已提交' });
  } catch (error) {
    next(error);
  }
});

router.post('/wallet/recharge', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const data = await createRecharge(req.body.amount, user.id);
    res.status(201).json({ data, message: '充值成功' });
  } catch (error) {
    next(error);
  }
});

router.get('/cos/policy', (req, res) => {
  res.json({
    data: {
      mode: 'placeholder',
      bucket: 'campus-runner-demo-1250000000',
      region: 'ap-guangzhou',
      note: '后续替换为腾讯云 COS 临时密钥接口'
    }
  });
});

export default router;
