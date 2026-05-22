import "dotenv/config";
import express from "express";
import { getPortfolioSummary } from "./paperTrading.js";

const app  = express();
const PORT = process.env.DASHBOARD_PORT ?? 3000;

app.get("/", (req, res) => {
  const p = getPortfolioSummary();
  const pnlColor  = p.totalPnl >= 0 ? "#00ff88" : "#ff4444";
  const openTrades = p.trades.filter((t) => t.status === "OPEN");
  const closedTrades = p.trades.filter((t) => t.status !== "OPEN");

  const tradeRows = [...p.trades].reverse().map((t) => {
    const statusEmoji = { OPEN: "🟡", WIN: "🟢", LOSS: "🔴", PARTIAL: "🟠" }[t.status] ?? "⚪";
    const pnl = t.pnl !== null ? `$${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}` : "—";
    const arcLink = t.arcTxHash
      ? `<a href="https://testnet.arcscan.app/tx/${t.arcTxHash}" target="_blank">🔗</a>`
      : "—";
    return `
      <tr>
        <td>${statusEmoji} ${t.status}</td>
        <td title="${t.question}">${t.question.slice(0, 45)}...</td>
        <td>${t.direction}</td>
        <td>$${t.betUSD}</td>
        <td>${(t.entryPrice * 100).toFixed(1)}%</td>
        <td>${(t.aiTrueProb * 100).toFixed(1)}%</td>
        <td>${t.aiEdge >= 0 ? "+" : ""}${t.aiEdge.toFixed(1)}%</td>
        <td style="color:${t.pnl >= 0 ? "#00ff88" : "#ff4444"}">${pnl}</td>
        <td>${arcLink}</td>
      </tr>`;
  }).join("");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>Arc Prediction Agent</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'Courier New', monospace; padding: 24px; }
    h1 { color: #7c3aed; font-size: 1.6rem; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card { background: #13131a; border: 1px solid #2a2a3a; border-radius: 10px; padding: 16px; }
    .card .label { color: #888; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .card .value { font-size: 1.5rem; font-weight: bold; }
    .card .value.green { color: #00ff88; }
    .card .value.purple { color: #a78bfa; }
    .card .value.yellow { color: #fbbf24; }
    .card .value.red { color: #f87171; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    thead th { background: #1a1a2e; color: #a78bfa; padding: 10px 12px; text-align: left; border-bottom: 1px solid #2a2a3a; }
    tbody tr { border-bottom: 1px solid #1a1a2e; transition: background 0.2s; }
    tbody tr:hover { background: #13131a; }
    td { padding: 10px 12px; }
    a { color: #7c3aed; text-decoration: none; }
    .section-title { color: #a78bfa; font-size: 0.9rem; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 1px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
    .badge.arc { background: #1e1b4b; color: #a78bfa; }
    footer { margin-top: 32px; color: #444; font-size: 0.75rem; text-align: center; }
  </style>
</head>
<body>
  <h1>🔮 Arc Prediction Market Agent</h1>
  <p class="subtitle">
    Agent ID: <span style="color:#a78bfa">${process.env.ARC_AGENT_ID}</span> &nbsp;|&nbsp;
    Arc Testnet: <span style="color:#a78bfa">Chain 5042002</span> &nbsp;|&nbsp;
    Mode: <span style="color:#fbbf24">PAPER TRADING</span> &nbsp;|&nbsp;
    Auto-refresh: 30s
  </p>

  <div class="grid">
    <div class="card">
      <div class="label">Bankroll</div>
      <div class="value purple">$${p.bankroll.toLocaleString()}</div>
    </div>
    <div class="card">
      <div class="label">Current Value</div>
      <div class="value ${p.currentValue >= p.bankroll ? "green" : "red"}">$${p.currentValue.toLocaleString()}</div>
    </div>
    <div class="card">
      <div class="label">Total PnL</div>
      <div class="value" style="color:${pnlColor}">$${p.totalPnl >= 0 ? "+" : ""}${p.totalPnl}</div>
    </div>
    <div class="card">
      <div class="label">Open Trades</div>
      <div class="value yellow">${p.openTrades}</div>
    </div>
    <div class="card">
      <div class="label">Win Rate</div>
      <div class="value green">${p.winRate}%</div>
    </div>
    <div class="card">
      <div class="label">Total Betted</div>
      <div class="value purple">$${p.totalBetted}</div>
    </div>
    <div class="card">
      <div class="label">Wins / Losses</div>
      <div class="value"><span style="color:#00ff88">${p.wins}W</span> / <span style="color:#f87171">${p.losses}L</span></div>
    </div>
    <div class="card">
      <div class="label">Total Trades</div>
      <div class="value purple">${p.trades.length}</div>
    </div>
  </div>

  <p class="section-title">📋 Trade History</p>
  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Market</th>
        <th>Dir</th>
        <th>Bet</th>
        <th>Entry</th>
        <th>AI Prob</th>
        <th>Edge</th>
        <th>PnL</th>
        <th>Arc</th>
      </tr>
    </thead>
    <tbody>${tradeRows}</tbody>
  </table>

  <footer>
    Arc Prediction Market Agent &nbsp;|&nbsp; Built for Agora Hackathon &nbsp;|&nbsp;
    ERC-8004 Agent ID: ${process.env.ARC_AGENT_ID} &nbsp;|&nbsp;
    Last updated: ${new Date().toLocaleString()}
  </footer>
</body>
</html>`);
});

app.get("/api/portfolio", (req, res) => {
  res.json(getPortfolioSummary());
});

app.listen(PORT, () => {
  console.log(`\n🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`📊 API:       http://localhost:${PORT}/api/portfolio`);
});

export { app };
