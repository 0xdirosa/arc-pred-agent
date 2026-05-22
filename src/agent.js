import "dotenv/config";
import { getActiveMarkets, analyzeMarket, calculateEV } from "./marketMonitor.js";
import { analyzeMarketWithAI } from "./aiAnalyzer.js";
import { calculateBetSize } from "./kellyCalculator.js";
import { paperBet, getPortfolioSummary } from "./paperTrading.js";
import { recordTradeReputation } from "./reputationUpdater.js";
import fs from "fs";

const BANKROLL_USD = parseFloat(process.env.PAPER_BANKROLL ?? "1000");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync("./logs/agent.log", line + "\n");
}

export async function runAgent() {
  log("🔮 Agent cycle started");

  const portfolio = getPortfolioSummary();
  log(`💼 Portfolio: $${portfolio.currentValue} | Open: ${portfolio.openTrades} | PnL: $${portfolio.totalPnl}`);

  // Cek apakah masih ada sisa bankroll
  const remaining = portfolio.bankroll - portfolio.totalBetted;
  if (remaining < 5) {
    log("⚠️  Bankroll habis, skip cycle ini");
    return;
  }

  // Fetch markets
  const [b1, b2, b3] = await Promise.all([
    getActiveMarkets({ limit: 50, offset: 0 }),
    getActiveMarkets({ limit: 50, offset: 50 }),
    getActiveMarkets({ limit: 50, offset: 100 }),
  ]);

  const allMarkets = [...b1, ...b2, ...b3];
  const analyzed   = allMarkets.map(analyzeMarket).filter(Boolean);

  const seen   = new Set();
  const unique = analyzed.filter((m) => {
    if (seen.has(m.conditionId)) return false;
    seen.add(m.conditionId);
    return true;
  });

  // Load existing open trades untuk hindari duplikat
  const existing = portfolio.trades
    .filter((t) => t.status === "OPEN")
    .map((t) => t.conditionId);

  const candidates = unique
    .filter((m) =>
      m.liquidity > 1000 &&
      parseFloat(m.spread) < 10 &&
      m.volume24hr > 500 &&
      m.acceptingOrders &&
      m.yesPrice > 0.03 &&
      m.yesPrice < 0.97 &&
      !m.question.toLowerCase().includes("win the 2026 fifa") &&
      !existing.includes(m.conditionId) // skip yang sudah ada posisi
    )
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 5);

  log(`📊 ${unique.length} markets | ${candidates.length} candidates | ${existing.length} existing positions`);

  let betsPlaced = 0;

  for (const market of candidates) {
    const ai = await analyzeMarketWithAI(market);
    if (!ai) continue;

    const ev  = calculateEV(market.yesPrice, ai.trueProb, 100);
    const bet = calculateBetSize(remaining, ai.trueProb, market.yesPrice);

    if (!ev.isPositiveEV || ai.confidence === "low" || bet.betSize < 1) {
      log(`⏭️  SKIP: ${market.question.slice(0, 40)}... (EV: $${ev.ev.toFixed(2)})`);
      continue;
    }

    // Paper bet
    const trade = paperBet(market, ai, bet.betSize, "YES");
    log(`✅ BET: ${market.question.slice(0, 40)}... | $${trade.betUSD} @ ${(trade.entryPrice * 100).toFixed(1)}%`);

    // Record ke Arc
    try {
      const rep = await recordTradeReputation(trade);
      log(`⛓️  Arc TX: ${rep.txHash} | Score: ${rep.score}`);
      betsPlaced++;
    } catch (err) {
      log(`⚠️  Arc error: ${err.message}`);
      betsPlaced++;
    }

    // Delay antar bet untuk hindari rate limit
    await new Promise((r) => setTimeout(r, 2000));
  }

  log(`🎯 Cycle complete: ${betsPlaced} bets placed`);
}
