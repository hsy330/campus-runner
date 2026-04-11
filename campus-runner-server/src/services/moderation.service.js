import { db } from '../data/store.js';
import { findTaskById, updateTaskRecord } from '../repositories/task.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeWord(word) {
  return String(word || '').trim();
}

export function listSensitiveWords() {
  return clone(db.sensitiveWords || []);
}

export function addSensitiveWord(word) {
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) {
    throw new Error('敏感词不能为空');
  }

  db.sensitiveWords = Array.isArray(db.sensitiveWords) ? db.sensitiveWords : [];
  if (!db.sensitiveWords.includes(normalizedWord)) {
    db.sensitiveWords.unshift(normalizedWord);
  }

  return listSensitiveWords();
}

export function removeSensitiveWord(word) {
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) {
    throw new Error('敏感词不能为空');
  }

  db.sensitiveWords = (db.sensitiveWords || []).filter((item) => item !== normalizedWord);
  return listSensitiveWords();
}

export function scanTextForSensitiveWords(text) {
  const content = String(text || '');
  const hitWords = (db.sensitiveWords || []).filter((word) => content.includes(word));
  return {
    passed: hitWords.length === 0,
    hitWords
  };
}

export async function removeTaskByAdmin(taskId) {
  const task = await findTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  const updated = await updateTaskRecord(taskId, {
    status: 'removed',
    auditStatus: 'removed'
  });
  const log = db.moderationLogs.find((item) => item.targetId === taskId);
  if (log) {
    log.status = 'removed';
  }

  return clone(updated);
}
