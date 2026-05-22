import "dotenv/config";
import { startScheduler } from "./src/scheduler.js";
import { runAgent } from "./src/agent.js";
import "./src/dashboard.js";

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES ?? "60");

console.log("🔮 Arc Prediction Market Agent");
console.log("═".repeat(60));
console.log(`📄 Mode     : PAPER TRADING`);
console.log(`⏱️  Interval : every ${INTERVAL} minutes`);
console.log(`🪪  Agent ID : ${process.env.ARC_AGENT_ID}`);
console.log(`⛓️  Arc Chain: 5042002 (Arc Testnet)`);
console.log("═".repeat(60));

startScheduler(runAgent, INTERVAL);
