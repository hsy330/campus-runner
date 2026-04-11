import cors from 'cors';
import express from 'express';

import adminRoutes from '../campus-runner-server/src/routes/admin.routes.js';
import authRoutes from '../campus-runner-server/src/routes/auth.routes.js';
import chatRoutes from '../campus-runner-server/src/routes/chat.routes.js';
import imRoutes from '../campus-runner-server/src/routes/im.routes.js';
import mapRoutes from '../campus-runner-server/src/routes/map.routes.js';
import socialRoutes from '../campus-runner-server/src/routes/social.routes.js';
import systemRoutes from '../campus-runner-server/src/routes/system.routes.js';
import taskRoutes from '../campus-runner-server/src/routes/task.routes.js';
import profileRoutes from '../campus-runner-server/src/routes/profile.routes.js';
import { rateLimitMiddleware } from '../campus-runner-server/src/middleware/rate-limit.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ data: { ok: true, service: 'campus-runner-server' } });
});

app.use('/api', rateLimitMiddleware);

app.use('/api', taskRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);
app.use('/api', chatRoutes);
app.use('/api', imRoutes);
app.use('/api', mapRoutes);
app.use('/api', socialRoutes);
app.use('/api', systemRoutes);
app.use('/api/auth', authRoutes);

app.use((error, req, res, next) => {
  const status = ['未登录', '登录已过期', '管理员未登录', '管理员登录已过期'].includes(error.message) ? 401 : 400;
  res.status(status).json({ message: error.message || '请求失败' });
});

export default app;
