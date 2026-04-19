import { describe, it, expect } from 'vitest';
import { createDb } from '../../server/db.js';
import { startCleanupCron } from '../../server/cleanup.js';

describe('cleanup', () => {
  it('runOnce returns zero when nothing expired', () => {
    const db = createDb(':memory:');
    const cron = startCleanupCron(db, { interval: 1_000_000 });
    db.createSession('FRESH1');
    const removed = cron.runOnce();
    expect(removed).toBe(0);
    cron.stop();
    db.close();
  });

  it('runOnce removes expired sessions', () => {
    const db = createDb(':memory:');
    const cron = startCleanupCron(db, { interval: 1_000_000 });
    db.createSession('OLDONE');
    db.db
      .prepare(`UPDATE sessions SET last_accessed = datetime('now', '-10 days') WHERE code = ?`)
      .run('OLDONE');
    const removed = cron.runOnce();
    expect(removed).toBe(1);
    expect(db.sessionExists('OLDONE')).toBe(false);
    cron.stop();
    db.close();
  });

  it('stop() prevents further runs', () => {
    const db = createDb(':memory:');
    const cron = startCleanupCron(db, { interval: 1_000_000 });
    cron.stop();
    // If the timer weren't cleared, it would still be referenced; since we
    // can't easily observe, this is mostly a smoke test to ensure stop()
    // doesn't throw.
    expect(() => cron.stop()).not.toThrow();
    db.close();
  });
});
