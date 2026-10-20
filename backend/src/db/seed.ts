import { initDatabase, isPostgresConnected } from './index.js';

async function seed() {
  console.log('[SEED] Running database initialization and seed...');
  await initDatabase();
  console.log(`[SEED] Finished. PostgreSQL Connected: ${isPostgresConnected}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('[SEED] Failed:', err);
  process.exit(1);
});
