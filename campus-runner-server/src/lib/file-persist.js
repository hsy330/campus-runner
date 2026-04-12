import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'db-snapshot.json');

function getCircularReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  };
}

export async function saveSnapshot(db) {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    const data = JSON.stringify(db, getCircularReplacer(), 2);
    await writeFile(SNAPSHOT_FILE, data, 'utf-8');
  } catch (err) {
    console.error('[persist] Save snapshot error:', err.message);
  }
}

export async function loadSnapshot() {
  try {
    if (!existsSync(SNAPSHOT_FILE)) {
      return null;
    }
    const data = await readFile(SNAPSHOT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[persist] Load snapshot error:', err.message);
    return null;
  }
}

export function startAutoSave(db, intervalMs = 30000) {
  const timer = setInterval(() => saveSnapshot(db), intervalMs);
  console.log(`[persist] Auto-save started (every ${intervalMs / 1000}s to ${SNAPSHOT_FILE})`);
  return timer;
}
