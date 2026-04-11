import { v4 as uuid } from 'uuid';

const now = new Date().toISOString();

export const db = {
  adminUsers: [
    {
      id: 'admin_1',
      username: 'admin',
      password: 'admin123',
      name: '默认管理员'
    }
  ],
  users: [
    {
      id: 'u_self',
      username: 'lin',
      passwordHash: '',
      nickname: '林同学',
      avatar: 'https://dummyimage.com/120x120/1d4ed8/ffffff.png&text=L',
      campus: '东方红校区',
      verified: true,
      authStatus: '已实名',
      realName: '林一凡',
      rating: 4.9,
      completedCount: 18,
      wallet: 168,
      score: 96
    },
    {
      id: 'u_runner',
      username: 'zhang',
      passwordHash: '',
      nickname: '张同学',
      avatar: 'https://dummyimage.com/120x120/0f766e/ffffff.png&text=Z',
      campus: '东方红校区',
      verified: true,
      authStatus: '已实名',
      realName: '张晨',
      rating: 4.8,
      completedCount: 32,
      wallet: 88,
      score: 94
    }
  ],
  tasks: [
    {
      id: 't_1001',
      campus: '东方红校区',
      category: '跑腿',
      title: '帮忙取快递送到 6 栋楼下',
      description: '菜鸟驿站 18:30 前取件，送到 6 栋宿舍楼下即可。',
      price: 6,
      pickupText: '东门菜鸟驿站',
      deliveryText: '6 栋宿舍楼',
      pickupLocation: {
        latitude: 28.1899,
        longitude: 112.8672,
        name: '东门菜鸟驿站'
      },
      deliveryLocation: {
        latitude: 28.1879,
        longitude: 112.8710,
        name: '6 栋宿舍楼'
      },
      deadlineText: '今天 18:30 前',
      distanceText: '约 820m',
      status: 'open',
      auditStatus: 'approved',
      publisherId: 'u_runner',
      publisherName: '张同学',
      images: [],
      createdAt: now
    },
    {
      id: 't_1002',
      campus: '东方红校区',
      category: '代拿代买',
      title: '帮带一杯少糖奶茶到图书馆',
      description: '蜜雪冰城大杯少糖，到了发 IM 消息。',
      price: 8,
      pickupText: '一食堂奶茶店',
      deliveryText: '图书馆一楼大厅',
      pickupLocation: {
        latitude: 28.1888,
        longitude: 112.8694,
        name: '一食堂奶茶店'
      },
      deliveryLocation: {
        latitude: 28.1902,
        longitude: 112.8721,
        name: '图书馆一楼大厅'
      },
      deadlineText: '今晚 20:00 前',
      distanceText: '约 1.2km',
      status: 'open',
      auditStatus: 'approved',
      publisherId: 'u_runner',
      publisherName: '张同学',
      images: [],
      createdAt: now
    }
  ],
  walletFlows: [
    {
      id: 'wf_1',
      userId: 'u_self',
      title: '首单奖励',
      type: 'reward',
      amount: 12,
      balanceAfter: 168,
      createdAt: now
    },
    {
      id: 'wf_2',
      userId: 'u_self',
      title: '微信提现审核中',
      type: 'withdraw',
      amount: -20,
      balanceAfter: 156,
      createdAt: now
    }
  ],
  orders: [
    {
      id: 'o_1',
      ownerUserId: 'u_runner',
      taskId: 't_1001',
      taskTitle: '帮忙取快递送到 6 栋楼下',
      campus: '东方红校区',
      status: 'open_waiting',
      role: 'publisher',
      ownerRole: 'publisher',
      amount: 6,
      withUser: '待接单',
      timeoutAt: now,
      updatedAt: now,
      createdAt: now
    }
  ],
  moderationLogs: [
    {
      id: 'm_1',
      type: 'task',
      targetId: 't_1001',
      status: 'approved',
      contentPreview: '帮忙取快递送到 6 栋楼下',
      createdAt: now
    },
    {
      id: 'm_2',
      type: 'task',
      targetId: 't_1002',
      status: 'approved',
      contentPreview: '帮带一杯少糖奶茶到图书馆',
      createdAt: now
    }
  ],
  sensitiveWords: ['微信', '手机号', '加V', '兼职刷单', '违禁品'],
  withdrawRequests: [],
  reviews: [],
  appeals: [],
  chatMessages: [],
  chatRooms: []
};

export function generateId(prefix) {
  return `${prefix}_${uuid().slice(0, 8)}`;
}
