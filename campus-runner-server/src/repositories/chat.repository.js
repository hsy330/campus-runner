import { db, generateId } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';

function persistChatState() {
  void saveSnapshot(db);
}

export function findOrCreateRoom(taskId, userA, userB) {
  const sorted = [userA, userB].sort();
  const key = `${taskId}:${sorted[0]}:${sorted[1]}`;
  let room = db.chatRooms.find((item) => item.key === key);
  if (!room) {
    const createdAt = new Date().toISOString();
    room = {
      id: generateId('room'),
      key,
      taskId,
      participants: sorted,
      lastReadBy: {
        [sorted[0]]: createdAt,
        [sorted[1]]: createdAt
      },
      createdAt
    };
    db.chatRooms.unshift(room);
    persistChatState();
  }
  return room;
}

export function createMessage(roomId, fromUserId, content, type = 'text') {
  const createdAt = new Date().toISOString();
  const message = {
    id: generateId('msg'),
    roomId,
    fromUserId,
    content: String(content || '').trim(),
    type: type || 'text',
    createdAt
  };

  db.chatMessages.unshift(message);
  const room = db.chatRooms.find((item) => item.id === roomId);
  if (room) {
    room.lastMessageAt = createdAt;
  }
  persistChatState();
  return message;
}

export function listMessagesByRoom(roomId, limit = 50) {
  return db.chatMessages
    .filter((item) => item.roomId === roomId)
    .slice(0, limit)
    .reverse();
}

export function listRoomsByUser(userId) {
  return db.chatRooms
    .filter((room) => room.participants.includes(userId))
    .map((room) => {
      const lastMessage = db.chatMessages.find((message) => message.roomId === room.id);
      return {
        ...room,
        lastMessage: lastMessage ? lastMessage.content : '',
        lastMessageType: lastMessage ? lastMessage.type : 'text',
        lastMessageAt: lastMessage ? lastMessage.createdAt : room.lastMessageAt || room.createdAt
      };
    })
    .sort((left, right) => new Date(right.lastMessageAt) - new Date(left.lastMessageAt));
}
