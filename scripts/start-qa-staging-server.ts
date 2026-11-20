import fs from 'fs';
import path from 'path';

async function startQaStagingServer() {
  const dataDir = path.join(process.cwd(), '.data');
  const stagingStorePath = path.join(dataDir, 'sprint_store_qa_staging.json');

  if (!fs.existsSync(stagingStorePath)) {
    console.error(`[FAIL-CLOSED ERROR] Clean staging store missing at ${stagingStorePath}. Run 'npx tsx scripts/generate-clean-qa-staging-store.ts' first.`);
    process.exit(1);
  }

  // Set environment variables BEFORE importing server/db modules
  process.env.STORE_PATH = 'sprint_store_qa_staging.json';
  process.env.PORT = '3001';
  process.env.ADMIN_EMAILS = 'qa.admin@bandsprint.test';

  console.log(`[QA Staging Server] Environment configured: STORE_PATH=${process.env.STORE_PATH}, PORT=${process.env.PORT}`);

  try {
    // Dynamic import forces server.ts and db.ts to evaluate with STORE_PATH already set
    await import('../server.ts');
    console.log(`[QA Staging Server] Isolated QA Staging Server active on http://127.0.0.1:${process.env.PORT}`);
  } catch (err: any) {
    console.error(`[QA Staging Server] Startup failed:`, err?.message || err);
    process.exit(1);
  }
}

startQaStagingServer();
