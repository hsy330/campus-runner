import { db } from '../data/store.js';
import { getMysqlPool } from '../lib/mysql.js';
import { ensurePersistenceReady } from './persistence.repository.js';

function syncMemoryFlow(flow) {
  const index = db.walletFlows.findIndex((item) => item.id === flow.id);
  if (index >= 0) {
    db.walletFlows[index] = { ...db.walletFlows[index], ...flow };
  } else {
    db.walletFlows.unshift({ ...flow });
  }
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

export async function listWalletFlowsByUserId(userId) {
  const ready = await ensurePersistenceReady();
  if (!ready) {
    return db.walletFlows.filter((item) => item.userId === userId);
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query(
    'SELECT * FROM wallet_flows WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(mapFlow);
}

export async function createWalletFlowRecord(flow) {
  syncMemoryFlow(flow);

  const ready = await ensurePersistenceReady();
  if (!ready) {
    return flow;
  }

  const pool = getMysqlPool();
  await pool.query(
    `INSERT INTO wallet_flows (
      id, user_id, title, type, amount, balance_after, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      flow.id,
      flow.userId,
      flow.title,
      flow.type,
      flow.amount,
      flow.balanceAfter,
      new Date(flow.createdAt || Date.now())
    ]
  );
  return flow;
}
