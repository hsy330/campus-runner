import { db } from '../data/store.js';
import { findTaskById, updateTaskRecord } from '../repositories/task.repository.js';
import { findUserById, updateUser } from '../repositories/user.repository.js';
import { updateOrdersByTaskId } from '../repositories/order.repository.js';
import { createWalletFlow } from './profile.service.js';

// Auto-complete orders in 'confirming' status after 24 hours
const AUTO_COMPLETE_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

export function startAutoCompleteListener() {
  setInterval(async () => {
    try {
      const now = Date.now();
      const tasks = db.tasks.filter((t) => t.status === 'confirming');

      for (const task of tasks) {
        const confirmingAt = new Date(task.confirmingAt || task.updatedAt || task.createdAt).getTime();
        if (now - confirmingAt >= AUTO_COMPLETE_MS) {
          try {
            task.status = 'finished';
            await updateTaskRecord(task.id, task);
            await updateOrdersByTaskId(task.id, {
              status: 'finished',
              updatedAt: new Date().toISOString()
            });

            // Pay runner
            const runner = await findUserById(task.runnerId);
            if (runner) {
              runner.wallet += task.price;
              runner.completedCount = (runner.completedCount || 0) + 1;
              await updateUser(runner.id, { wallet: runner.wallet, completedCount: runner.completedCount });
              await createWalletFlow(runner.id, '任务自动完成收入', 'income', task.price, runner.wallet);
            }

            const publisher = await findUserById(task.publisherId);
            if (publisher) {
              publisher.completedCount = (publisher.completedCount || 0) + 1;
              await updateUser(publisher.id, { completedCount: publisher.completedCount });
              await createWalletFlow(publisher.id, '任务自动完成结算', 'expense', 0, publisher.wallet);
            }

            console.log(`[auto-complete] Task ${task.id} auto-completed after 24h`);
          } catch (err) {
            console.error(`[auto-complete] Error auto-completing task ${task.id}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('[auto-complete] Error in auto-complete listener:', err.message);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[auto-complete] Listener started (24h auto-complete for confirming orders)');
}
