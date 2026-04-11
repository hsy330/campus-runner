import express from 'express';

import { requireUser } from '../services/auth.service.js';

const router = express.Router();

router.get('/im/profile', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    res.json({
      data: {
        sdkAppId: '',
        mode: 'placeholder',
        provider: 'Tencent Cloud IM',
        enabled: false,
        imUserId: `im_${user.id}`,
        note: '请在服务端接入腾讯云 IM UserSig 生成逻辑后启用真实会话。'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/im/usersig', async (req, res, next) => {
  try {
    const user = await requireUser(req);
    res.json({
      data: {
        sdkAppId: '',
        userId: `im_${user.id}`,
        userSig: '',
        expireAt: null,
        enabled: false,
        mode: 'placeholder',
        note: '当前为占位接口，后续请改为服务端实时签发 UserSig。'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
