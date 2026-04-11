# 校园跑腿平台 (Campus Runner)

湖南第一师范学院校园跑腿服务平台，支持多校区、任务发布与接单、在线聊天、钱包支付、管理后台等功能。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 Web | React 19 + Vite 6 + React Router 7 + Leaflet |
| 前端小程序 | 微信小程序 (WXML/WXSS) |
| 后端 | Express.js 4 + Node.js (ESM) |
| 数据库 | MySQL (可选) + Redis (可选)，支持纯内存运行 |
| 部署 | Vercel (Serverless) / Render (Docker) / GitHub Pages |

## 功能模块

### 用户端
- **任务大厅** - 浏览、筛选、搜索任务（跑腿、代拿代买、游戏陪玩等 7 大分类）
- **发布任务** - 地图选点、图片上传、价格设定
- **接单流程** - 接单 → 进行中 → 待确认 → 已完成（24h 自动完成）
- **订单管理** - 已发布 / 已接单双视图
- **在线聊天** - 实时消息（文本/图片/打赏），房间制
- **钱包系统** - 充值、提现、交易流水
- **评价系统** - 三维评分（速度/态度/质量）
- **申诉系统** - 订单纠纷申诉
- **黑名单** - 用户拉黑
- **地图服务** - Leaflet + OpenStreetMap + 腾讯地图

### 管理后台
- **数据概览** - 11 项核心指标（用户数、任务数、交易额等）
- **用户管理** - 列表搜索、封禁/解封
- **任务管理** - 状态筛选、关键词搜索、审批、删除
- **订单管理** - 全平台订单列表
- **财务管理** - 钱包流水记录
- **提现审核** - 批准/驳回提现申请（驳回自动退款）
- **违禁词管理** - 添加/删除敏感词
- **审核日志** - 内容审核记录
- **申诉处理** - 通过/驳回用户申诉

## 项目结构

```
code-campus/
├── campus-runner-web/         # React Web 前端
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # 公共组件
│   │   ├── lib/api.js        # API 服务层
│   │   ├── auth.jsx          # 认证上下文
│   │   ├── App.jsx           # 路由配置
│   │   └── index.css         # 全局样式
│   └── vite.config.js
├── campus-runner-server/      # Express 后端
│   ├── src/
│   │   ├── routes/           # API 路由
│   │   ├── services/         # 业务逻辑
│   │   ├── repositories/     # 数据访问层
│   │   ├── data/store.js     # 内存数据 + 种子数据
│   │   ├── lib/              # MySQL/Redis/Session 工具
│   │   └── middleware/       # 限流中间件
│   └── Dockerfile
├── campus-runner-mini/        # 微信小程序
├── api/index.js               # Vercel Serverless 入口
├── vercel.json                # Vercel 部署配置
├── .github/workflows/         # GitHub Actions
└── package.json               # Monorepo 脚本
```

## 快速启动

### 前置要求
- Node.js >= 18
- npm >= 9

### 1. 安装依赖

```bash
# 根目录安装所有依赖
cd campus-runner-web && npm install
cd ../campus-runner-server && npm install
```

### 2. 启动后端

```bash
cd campus-runner-server
node src/server.js
# 服务启动在 http://localhost:3000
```

后端支持纯内存运行，无需 MySQL/Redis。首次启动会自动加载种子数据。

### 3. 启动前端

```bash
cd campus-runner-web
npm run dev
# 前端启动在 http://localhost:5173，自动代理 /api 到后端
```

### 4. 访问应用

| 地址 | 说明 |
|---|---|
| http://localhost:5173 | 用户端 Web |
| http://localhost:5173/admin/login | 管理后台 |

### 5. 测试账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 普通用户 | lin | (注册时设定) |
| 普通用户 | zhang | (注册时设定) |
| 管理员 | admin | admin123 |

## 部署

### Vercel 部署（推荐 - 全栈）

1. 将代码推送到 GitHub
2. 登录 [Vercel](https://vercel.com)
3. 点击 "Import Project" → 选择 GitHub 仓库
4. 保持默认配置，点击 Deploy
5. 部署完成后获得 `.vercel.app` 地址

Vercel 配置已在 `vercel.json` 中设置，自动构建前端并将后端部署为 Serverless Function。

### GitHub Pages 部署（仅前端 UI）

项目已配置 GitHub Actions 自动部署：
1. 在 GitHub 仓库 Settings → Pages 中，Source 选择 "GitHub Actions"
2. 推送代码到 `main` 或 `master` 分支
3. Actions 自动构建并部署前端
4. 访问地址：`https://<username>.github.io/campus-runner/`

注意：GitHub Pages 仅部署静态前端，不包含后端 API。完整功能请使用 Vercel 部署。

### Render 部署

项目包含 `render.yaml`，可直接在 Render 平台导入部署。

## API 接口概览

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/verify` - 验证 Token

### 任务
- `GET /api/tasks` - 任务列表
- `GET /api/tasks/:id` - 任务详情
- `POST /api/tasks` - 发布任务
- `POST /api/tasks/:id/accept` - 接单
- `POST /api/tasks/:id/status` - 更新状态
- `POST /api/tasks/:id/review` - 提交评价
- `POST /api/tasks/:id/appeal` - 提交申诉

### 用户
- `GET /api/profile/bundle` - 个人信息包
- `PUT /api/auth/profile` - 更新资料
- `GET /api/orders` - 我的订单

### 钱包
- `POST /api/wallet/recharge` - 充值
- `POST /api/wallet/withdraw` - 提现

### 聊天
- `GET /api/chat/rooms` - 聊天室列表
- `POST /api/chat/rooms` - 创建聊天室
- `GET /api/chat/rooms/:id/messages` - 消息列表
- `POST /api/chat/rooms/:id/messages` - 发送消息

### 地图
- `GET /api/map/suggestions` - 地点搜索
- `POST /api/map/route` - 路线规划

### 管理后台
- `POST /api/admin/login` - 管理员登录
- `GET /api/admin/session` - 验证管理员身份
- `GET /api/admin/stats` - 仪表盘统计
- `GET /api/admin/users` - 用户列表
- `POST /api/admin/users/:id/ban` - 封禁用户
- `POST /api/admin/users/:id/unban` - 解封用户
- `GET /api/admin/tasks` - 任务列表
- `POST /api/admin/tasks/:id/approve` - 审批任务
- `POST /api/admin/tasks/:id/remove` - 删除任务
- `GET /api/admin/orders` - 订单列表
- `GET /api/admin/wallet/flows` - 财务流水
- `GET /api/admin/withdrawals` - 提现申请
- `POST /api/admin/withdrawals/:id/approve` - 批准提现
- `POST /api/admin/withdrawals/:id/reject` - 驳回提现
- `GET /api/admin/sensitive-words` - 违禁词列表
- `POST /api/admin/sensitive-words` - 添加违禁词
- `POST /api/admin/sensitive-words/remove` - 删除违禁词
- `GET /api/admin/moderation` - 审核日志
- `GET /api/admin/appeals` - 申诉列表
- `POST /api/admin/appeals/:id/resolve` - 处理申诉
- `POST /api/admin/appeals/:id/reject` - 驳回申诉

## 开发说明

- 后端采用**双持久化模式**：优先 MySQL，不可用时自动降级到内存存储
- 内存模式预置了种子数据（2 个用户、2 个示例任务），可直接体验
- 管理后台独立认证体系，与用户端 Token 分离
- 前端所有页面均已适配移动端响应式布局

## License

MIT
