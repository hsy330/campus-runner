import { db } from '../data/store.js';
import { updateTaskRecord } from '../repositories/task.repository.js';
import { updateOrdersByTaskId } from '../repositories/order.repository.js';
import { applyWalletDelta, createWalletFlow } from './profile.service.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { saveSnapshot } from '../lib/file-persist.js';
import { ORDER_STATUS, TASK_STATUS } from '../lib/task-status.js';

const AUTO_COMPLETE_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function startAutoCompleteListener() {
  setInterval(async () => {
    try {
      const now = Date.now();
      const tasks = db.tasks.filter((item) => item.status === TASK_STATUS.CONFIRMING);

      for (const task of tasks) {
        const confirmingAt = new Date(task.confirmingAt || task.updatedAt || task.createdAt).getTime();
        if (now - confirmingAt < AUTO_COMPLETE_MS) {
          continue;
        }

        try {
          const resolvedAt = new Date().toISOString();
          task.status = TASK_STATUS.FINISHED;
          task.updatedAt = resolvedAt;
          task.finishedAt = resolvedAt;
          await updateTaskRecord(task.id, task);
          await updateOrdersByTaskId(task.id, {
            status: ORDER_STATUS.FINISHED,
            updatedAt: resolvedAt
          });

          const runner = await findUserById(task.runnerId);
          if (runner) {
            const completedCount = (runner.completedCount || 0) + 1;
            await applyWalletDelta(runner.id, task.price, {
              title: '任务自动完成收入',
              type: 'income',
              persistSnapshot: false
            });
            await updateUser(runner.id, { completedCount });
          }

          const publisher = await findUserById(task.publisherId);
          if (publisher) {
            const completedCount = (publisher.completedCount || 0) + 1;
            await updateUser(publisher.id, { completedCount });
            await createWalletFlow(publisher.id, '任务自动完成结算', 'expense', 0, publisher.wallet, false);
          }

          await saveSnapshot(db);
          console.log(`[auto-complete] Task ${task.id} auto-completed after 24h`);
        } catch (error) {
          console.error(`[auto-complete] Error auto-completing task ${task.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[auto-complete] Error in auto-complete listener:', error.message);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[auto-complete] Listener started (24h auto-complete for confirming orders)');
}
