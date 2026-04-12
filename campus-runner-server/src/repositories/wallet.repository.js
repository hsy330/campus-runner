import { db } from '../data/store.js';
import { saveSnapshot } from '../lib/file-persist.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function syncMemoryFlow(flow) {
  const nextFlow = clone(flow);
  const index = db.walletFlows.findIndex((item) => item.id === nextFlow.id);
  if (index >= 0) {
    db.walletFlows[index] = { ...db.walletFlows[index], ...nextFlow };
  } else {
    db.walletFlows.unshift(nextFlow);
  }
  return db.walletFlows.find((item) => item.id === nextFlow.id) || nextFlow;
}

function mapFlow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.type,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    createdAt: row.created_at
  };
}

async function loadAllWalletFlowsFromMysql() {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return [];
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query('SELECT * FROM wallet_flows ORDER BY created_at DESC');
    const flows = rows.map(mapFlow);
    flows.forEach(syncMemoryFlow);
    return flows;
  } catch {
    return [];
  }
}

export async function listWalletFlowsByUserId(userId) {
  if (db.walletFlows.length === 0) {
    await loadAllWalletFlowsFromMysql();
  }
  return clone(db.walletFlows.filter((item) => item.userId === userId));
}

export async function createWalletFlowRecord(flow) {
  const nextFlow = syncMemoryFlow(flow);
  await saveSnapshot(db);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return clone(nextFlow);
  }

  try {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO wallet_flows (
        id, user_id, title, type, amount, balance_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nextFlow.id,
        nextFlow.userId,
        nextFlow.title,
        nextFlow.type,
        nextFlow.amount,
        nextFlow.balanceAfter,
        new Date(nextFlow.createdAt || Date.now())
      ]
    );
  } catch {
    return clone(nextFlow);
  }

  return clone(nextFlow);
}
