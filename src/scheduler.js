import cron from "node-cron";
import { execSync } from "child_process";
import fs from "fs";

const LOG_FILE = "./logs/scheduler.log";

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

export function startScheduler(runFn, intervalMinutes = 60) {
  log(`🕐 Scheduler started — running every ${intervalMinutes} minutes`);
  log(`   Next run: ${new Date(Date.now() + intervalMinutes * 60000).toLocaleTimeString()}`);

  // Jalankan sekali langsung saat start
  runFn().catch((err) => log(`❌ Error: ${err.message}`));

  // Schedule berikutnya
  cron.schedule(`*/${intervalMinutes} * * * *`, () => {
    log(`\n🔄 Scheduled run triggered`);
    runFn().catch((err) => log(`❌ Error: ${err.message}`));
  });
}
