import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import imRoutes from './routes/im.routes.js';
import mapRoutes from './routes/map.routes.js';
import socialRoutes from './routes/social.routes.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import profileRoutes from './routes/profile.routes.js';
import systemRoutes from './routes/system.routes.js';
import taskRoutes from './routes/task.routes.js';
import authRoutes from './routes/auth.routes.js';
import { startAutoCompleteListener } from './services/auto-complete.service.js';
import { loadSnapshot, startAutoSave } from './lib/file-persist.js';
import { db, restoreFromSnapshot } from './data/store.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(publicDir));

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

// Serve built frontend in production
const webDistDir = path.resolve(__dirname, '../../campus-runner-web/dist');
app.use(express.static(webDistDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
    return next();
  }
  res.sendFile(path.join(webDistDir, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'dashboard.html'));
});

app.use((error, req, res, next) => {
  const status = ['未登录', '登录已过期', '管理员未登录', '管理员登录已过期'].includes(error.message) ? 401 : 400;
  res.status(status).json({ message: error.message || '请求失败' });
});

const snapshot = await loadSnapshot();
if (snapshot) {
  restoreFromSnapshot(snapshot);
}

startAutoSave(db, 5000);
startAutoCompleteListener();

export default app;
