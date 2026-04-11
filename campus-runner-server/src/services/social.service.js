import { db, generateId } from '../data/store.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { createWalletFlow } from './profile.service.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export function addToBlacklist(userId, targetUserId) {
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('用户不存在');
  if (!Array.isArray(user.blacklist)) user.blacklist = [];
  if (user.blacklist.includes(targetUserId)) throw new Error('已在黑名单中');
  user.blacklist.push(targetUserId);
  return clone(user.blacklist);
}

export function removeFromBlacklist(userId, targetUserId) {
  const user = db.users.find(u => u.id === userId);
  if (!user || !Array.isArray(user.blacklist)) return [];
  user.blacklist = user.blacklist.filter(id => id !== targetUserId);
  return clone(user.blacklist);
}

export function getBlacklist(userId) {
  const user = db.users.find(u => u.id === userId);
  return clone(user?.blacklist || []);
}

export function isBlacklisted(userId, targetUserId) {
  const user = db.users.find(u => u.id === userId);
  return Array.isArray(user?.blacklist) && user.blacklist.includes(targetUserId);
}

export function sendTip(fromUserId, toUserId, amount) {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('打赏金额必须大于0');

  const from = db.users.find(u => u.id === fromUserId);
  const to = db.users.find(u => u.id === toUserId);
  if (!from || !to) throw new Error('用户不存在');
  if (from.wallet < amount) throw new Error('余额不足');

  from.wallet -= amount;
  to.wallet += amount;

  const tip = {
    id: generateId('tip'),
    fromUserId,
    toUserId,
    amount,
    createdAt: new Date().toISOString()
  };
  if (!Array.isArray(db.tips)) db.tips = [];
  db.tips.unshift(tip);

  return clone(tip);
}
