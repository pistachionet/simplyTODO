const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export function startCleanupCron(db, { interval = CLEANUP_INTERVAL } = {}) {
  const run = () => {
    const deleted = db.deleteExpiredSessions('-2 days');
    if (deleted > 0) {
      console.log(`[cleanup] Purged ${deleted} expired session(s)`);
    }
    return deleted;
  };

  // Run once on startup
  run();

  // Then periodically
  const timer = setInterval(run, interval);

  // Return a stop handle (used by tests and graceful shutdown)
  return {
    stop() {
      clearInterval(timer);
    },
    runOnce: run,
  };
}
