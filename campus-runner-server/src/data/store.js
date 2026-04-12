import { v4 as uuid } from 'uuid';

export const db = {
  adminUsers: [
    {
      id: 'admin_1',
      username: 'admin',
      passwordHash: 'campus-runner-admin:e04e00313cb7ea907d108112c02088ce9728a9379bf57ba0570ea78b37b6a67ec230bfecba680ee4936a6079f6f3da0cf6ea096d2c2b81b9b19003205684e69b',
      name: '默认管理员'
    }
  ],
  adminSessions: [],
  users: [],
  tasks: [],
  walletFlows: [],
  orders: [],
  moderationLogs: [],
  sensitiveWords: ['微信', '手机号', '加V', '兼职刷单', '违禁品'],
  withdrawRequests: [],
  reviews: [],
  appeals: [],
  chatMessages: [],
  chatRooms: [],
  tips: []
};

export function generateId(prefix) {
  return `${prefix}_${uuid().slice(0, 8)}`;
}

export function restoreFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;

  // Restore each array/collection, preserving functions and admin config
  const keys = ['users', 'tasks', 'walletFlows', 'orders', 'moderationLogs',
    'reviews', 'appeals', 'chatMessages', 'chatRooms', 'withdrawRequests',
    'sensitiveWords', 'adminSessions', 'tips'];

  for (const key of keys) {
    if (Array.isArray(snapshot[key])) {
      db[key] = snapshot[key];
    }
  }

  console.log(`[persist] Restored: ${db.users.length} users, ${db.tasks.length} tasks, ${db.orders.length} orders, ${db.chatMessages.length} messages`);
}
