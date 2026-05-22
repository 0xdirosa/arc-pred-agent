cat > README.md << 'EOF'
# 🔮 Arc Prediction Market Agent

> AI-powered prediction market trading agent built on Arc Testnet for the **Agora Hackathon** by Canteen × Circle × Arc.

## Overview

An autonomous AI agent that monitors Polymarket prediction markets, identifies +EV (positive expected value) opportunities using LLM-based probability estimation, sizes bets optimally using Kelly Criterion, and records every decision on-chain via **ERC-8004** identity and reputation standards on Arc Testnet.

---

## Architecture

[Polymarket Gamma API] ──→ [Market Monitor] ──→ [AI Analyzer (Groq LLaMA 70B)]
↓
[Kelly Calculator]
↓
[Paper Trading Engine]
↓
[Arc Testnet — ERC-8004 ReputationRegistry]
↓
[Live Dashboard]

## Features

- **Market Discovery** — fetches 150+ active markets from Polymarket across all categories (sports, politics, crypto, entertainment)
- **AI Probability Estimation** — Groq LLaMA 70B estimates true probability for each market and compares against market-implied probability to detect mispricing
- **Kelly Criterion Sizing** — calculates optimal bet size using fractional Kelly (25%) to maximize long-term growth while managing risk
- **ERC-8004 Onchain Identity** — agent registered with unique identity on Arc Testnet (Agent ID: 18005, status: kyc_verified)
- **Reputation Tracking** — every trade decision recorded to ReputationRegistry with dynamic scoring (0-100) based on edge and outcome
- **Autonomous Loop** — runs every 60 minutes, fully autonomous, skips duplicate positions
- **Live Dashboard** — real-time portfolio tracker with trade history and Arc TX links
- **Paper Trading Mode** — full simulation without real capital, ideal for demo and validation

---

## Onchain Identity (ERC-8004)

| Contract | Address |
|---|---|
| IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ValidationRegistry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |

| Property | Value |
|---|---|
| Agent ID | 18005 |
| Owner Wallet | `0x80Fb5c547E2bceCa133a2971680f6428eaA4b1c6` |
| Validator Wallet | `0xe3d9F10154C7eD5617aE9b5d44753bbe64599D77` |
| Status | `kyc_verified` |
| Arc Chain ID | 5042002 (Arc Testnet) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 |
| Blockchain | Arc Testnet (EVM, Chain ID 5042002) |
| EVM Library | Viem + Ethers.js |
| AI Model | Groq LLaMA 3.3 70B Versatile |
| Market Data | Polymarket Gamma API + CLOB API |
| Scheduler | node-cron |
| Dashboard | Express.js |
| Standards | ERC-8004 (Agent Identity + Reputation) |

---

## Project Structure

arc-pred-agent/
├── index.js                  # Entry point — scheduler + dashboard
├── src/
│   ├── agent.js              # Main agent loop
│   ├── marketMonitor.js      # Polymarket API + EV calculation
│   ├── aiAnalyzer.js         # Groq LLM probability estimation
│   ├── kellyCalculator.js    # Kelly Criterion bet sizing
│   ├── paperTrading.js       # Paper trading engine + portfolio
│   ├── reputationUpdater.js  # Arc ERC-8004 reputation recording
│   ├── arcSettlement.js      # Arc wallet + on-chain logging
│   ├── dashboard.js          # Express dashboard server
│   └── scheduler.js          # node-cron auto-loop
├── logs/
│   ├── paper_trades.json     # Trade history
│   ├── agent.log             # Agent activity log
│   └── scheduler.log         # Scheduler log
└── .env                      # Environment config

---

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/0xdirosa/arc-pred-agent
cd arc-pred-agent
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit .env with your credentials:

Groq AI
GROQ_API_KEY=your_groq_api_key
Arc Testnet
ARC_RPC_URL=your_arc_rpc_url
ARC_WALLET_ADDRESS=your_owner_wallet_address
ARC_PRIVATE_KEY=your_owner_private_key
ARC_AGENT_ID=18005
ERC-8004
OWNER_PRIVATE_KEY=your_owner_private_key
VALIDATOR_PRIVATE_KEY=your_validator_private_key

### 3. Run

```bash
node index.js
```

Dashboard tersedia di http://localhost:3000

---

## How It Works

### 1. Market Discovery
Agent fetches 150+ active markets from Polymarket Gamma API every cycle, filtering by liquidity (>$1k), spread (<10%), and 24h volume (>$500).

### 2. AI Analysis
Each candidate market is analyzed by Groq LLaMA 70B which estimates:
- **True probability** vs market-implied probability
- **Edge** (difference between true prob and market price)
- **Confidence** (low/medium/high)
- **Verdict** (underpriced/overpriced/fairly_priced)

### 3. Kelly Sizing
For +EV opportunities, fractional Kelly (25%) calculates optimal bet size:
f = (b x p - q) / b x 0.25
Where b = decimal odds, p = true prob, q = 1-p.

### 4. Onchain Recording
Every trade decision is recorded to Arc Testnet ReputationRegistry with:
- Dynamic score (0-100) based on edge size
- Trade metadata (question, direction, bet size, edge)
- Verifiable TX hash on Arc block explorer

---

## Sample Output

```
✅ BET: Will the Carolina Hurricanes win the 2026 NHL...
$49.3 YES @ 31.5% | AI True Prob: 45.0% | Edge: +13.5%
Arc TX: 0xf9c70e96...
Reputation Score: 80/100```

---

## Arc Integration

This agent demonstrates Arc value proposition for the agentic economy:

- **ERC-8004 Identity** — agent has verifiable onchain identity with reputation history
- **Sub-second finality** — trade decisions confirmed in under 1 second on Arc
- **USDC-native** — all settlement in stable unit of account
- **Reputation as trust** — score builds over time, enabling agent-to-agent trust

---

## Hackathon

Built for **Agora Hackathon** by Canteen x Circle x Arc
RFB #2 — Prediction Market Trader Intelligence
Submission deadline: May 25, 2026

**Team:** @0xdirosa (GitHub) | @mbethik_ (Discord) | @mbethik (Telegram)

---

## License

MIT
ENDOFFILE
