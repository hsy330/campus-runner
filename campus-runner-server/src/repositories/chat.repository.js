import { db, generateId } from '../data/store.js';

export function findOrCreateRoom(taskId, userA, userB) {
  const sorted = [userA, userB].sort();
  const key = `${taskId}:${sorted[0]}:${sorted[1]}`;
  let room = db.chatRooms.find((r) => r.key === key);
  if (!room) {
    room = {
      id: generateId('room'),
      key,
      taskId,
      participants: sorted,
      createdAt: new Date().toISOString()
    };
    db.chatRooms.unshift(room);
  }
  return room;
}

export function createMessage(roomId, fromUserId, content, type = 'text') {
  const msg = {
    id: generateId('msg'),
    roomId,
    fromUserId,
    content: String(content || '').trim(),
    type: type || 'text',
    createdAt: new Date().toISOString()
  };
  db.chatMessages.unshift(msg);
  return msg;
}

export function listMessagesByRoom(roomId, limit = 50) {
  return db.chatMessages
    .filter((m) => m.roomId === roomId)
    .slice(0, limit)
    .reverse();
}

export function listRoomsByUser(userId) {
  return db.chatRooms
    .filter((r) => r.participants.includes(userId))
    .map((room) => {
      const lastMsg = db.chatMessages.find((m) => m.roomId === room.id);
      return {
        ...room,
        lastMessage: lastMsg ? lastMsg.content : '',
        lastMessageAt: lastMsg ? lastMsg.createdAt : room.createdAt,
        unreadCount: 0
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
}
