import { db, generateId } from '../data/store.js';
import { updateUser } from '../repositories/user.repository.js';
import { applyWalletDelta, roundAmount } from './profile.service.js';
import { saveSnapshot } from '../lib/file-persist.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function addToBlacklist(userId, targetUserId) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error('用户不存在');
  if (userId === targetUserId) throw new Error('不能拉黑自己');
  if (!Array.isArray(user.blacklist)) user.blacklist = [];
  if (user.blacklist.includes(targetUserId)) throw new Error('已在黑名单中');
  user.blacklist.push(targetUserId);
  await updateUser(userId, { blacklist: user.blacklist });
  await saveSnapshot(db);
  return clone(user.blacklist);
}

export async function removeFromBlacklist(userId, targetUserId) {
  const user = db.users.find((item) => item.id === userId);
  if (!user || !Array.isArray(user.blacklist)) return [];
  user.blacklist = user.blacklist.filter((id) => id !== targetUserId);
  await updateUser(userId, { blacklist: user.blacklist });
  await saveSnapshot(db);
  return clone(user.blacklist);
}

export function getBlacklist(userId) {
  const user = db.users.find((item) => item.id === userId);
  return clone(user?.blacklist || []);
}

export function isBlacklisted(userId, targetUserId) {
  const user = db.users.find((item) => item.id === userId);
  return Array.isArray(user?.blacklist) && user.blacklist.includes(targetUserId);
}

export async function sendTip(fromUserId, toUserId, amount) {
  const value = roundAmount(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('打赏金额必须大于0');
  if (fromUserId === toUserId) throw new Error('不能给自己打赏');

  await applyWalletDelta(fromUserId, -value, {
    title: '打赏支出',
    type: 'expense',
    persistSnapshot: false
  });
  await applyWalletDelta(toUserId, value, {
    title: '收到打赏',
    type: 'income',
    persistSnapshot: false
  });

  const tip = {
    id: generateId('tip'),
    fromUserId,
    toUserId,
    amount: value,
    createdAt: new Date().toISOString()
  };
  if (!Array.isArray(db.tips)) db.tips = [];
  db.tips.unshift(tip);
  await saveSnapshot(db);

  return clone(tip);
}
