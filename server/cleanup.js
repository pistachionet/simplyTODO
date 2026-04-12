import { deleteExpiredSessions } from './db.js';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export function startCleanupCron() {
  const run = () => {
    const deleted = deleteExpiredSessions('-2 days');
    if (deleted > 0) {
      console.log(`[cleanup] Purged ${deleted} expired session(s)`);
    }
  };

  // Run once on startup
  run();

  // Then every hour
  setInterval(run, CLEANUP_INTERVAL);
}
