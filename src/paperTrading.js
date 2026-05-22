import fs from "fs";
import path from "path";

const LOG_FILE = "./logs/paper_trades.json";

/**
 * Load existing paper trades dari file
 */
function loadTrades() {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Simpan trades ke file
 */
function saveTrades(trades) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(trades, null, 2));
}

/**
 * Simulasi eksekusi bet
 */
export function paperBet(market, ai, betUSD, direction = "YES") {
  const trades = loadTrades();

  const trade = {
    id:           `paper_${Date.now()}`,
    timestamp:    new Date().toISOString(),
    status:       "OPEN",
    question:     market.question,
    conditionId:  market.conditionId,
    tokenId:      direction === "YES" ? market.yesTokenId : market.noTokenId,
    direction,
    entryPrice:   direction === "YES" ? market.yesPrice : market.noPrice,
    betUSD:       parseFloat(betUSD.toFixed(2)),
    sharesOwned:  parseFloat((betUSD / (direction === "YES" ? market.yesPrice : market.noPrice)).toFixed(4)),
    aiTrueProb:   ai.trueProb,
    aiEdge:       ai.edge,
    aiConfidence: ai.confidence,
    aiReasoning:  ai.reasoning,
    endDate:      market.endDate,
    resolvedAt:   null,
    resolvedPrice: null,
    pnl:          null,
    arcTxHash:    null,
  };

  trades.push(trade);
  saveTrades(trades);

  return trade;
}

/**
 * Resolve trade (simulasi)
 * resolvedPrice: 1.0 = WIN, 0.0 = LOSS
 */
export function resolveTrade(tradeId, resolvedPrice) {
  const trades = loadTrades();
  const idx = trades.findIndex((t) => t.id === tradeId);
  if (idx === -1) throw new Error(`Trade ${tradeId} not found`);

  const trade = trades[idx];
  const pnl = (resolvedPrice - trade.entryPrice) * trade.sharesOwned;

  trades[idx] = {
    ...trade,
    status:        resolvedPrice === 1 ? "WIN" : resolvedPrice === 0 ? "LOSS" : "PARTIAL",
    resolvedAt:    new Date().toISOString(),
    resolvedPrice,
    pnl:           parseFloat(pnl.toFixed(4)),
  };

  saveTrades(trades);
  return trades[idx];
}

/**
 * Tampilkan portfolio summary
 */
export function getPortfolioSummary() {
  const trades = loadTrades();
  const bankroll = parseFloat(process.env.PAPER_BANKROLL ?? "1000");

  const open   = trades.filter((t) => t.status === "OPEN");
  const closed  = trades.filter((t) => t.status !== "OPEN");
  const wins    = trades.filter((t) => t.status === "WIN");
  const losses  = trades.filter((t) => t.status === "LOSS");

  const totalBetted  = trades.reduce((s, t) => s + t.betUSD, 0);
  const totalPnl     = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate      = closed.length > 0 ? (wins.length / closed.length * 100).toFixed(1) : "N/A";
  const currentValue = bankroll - totalBetted + totalPnl;

  return {
    bankroll,
    currentValue:  parseFloat(currentValue.toFixed(2)),
    totalBetted:   parseFloat(totalBetted.toFixed(2)),
    totalPnl:      parseFloat(totalPnl.toFixed(2)),
    openTrades:    open.length,
    closedTrades:  closed.length,
    wins:          wins.length,
    losses:        losses.length,
    winRate,
    trades,
  };
}
