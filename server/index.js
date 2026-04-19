import { createDb, DEFAULT_DB_PATH } from './db.js';
import { buildApp } from './buildApp.js';
import { startCleanupCron } from './cleanup.js';

async function start() {
  const db = createDb(DEFAULT_DB_PATH);
  const app = await buildApp({ db, logger: true });

  // Start cleanup cron
  startCleanupCron(db);

  const port = process.env.PORT || 3001;
  await app.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
