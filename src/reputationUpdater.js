import "dotenv/config";
import { executeContract } from "./circleWallet.js";
import { createPublicClient, http, keccak256, toHex } from "viem";
import { arcTestnet } from "viem/chains";

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const AGENT_ID = process.env.ARC_AGENT_ID ?? "18005";

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

function calculateScore(trade) {
  if (trade.status === "WIN")  return 90;
  if (trade.status === "LOSS") return 40;
  const edge = trade.aiEdge ?? 0;
  if (edge > 10) return 80;
  if (edge > 5)  return 70;
  return 60;
}

/**
 * Record trade reputation ke Arc via Circle SDK
 */
export async function recordTradeReputation(trade) {
  const score        = calculateScore(trade);
  const tag          = `pred_market_${trade.status.toLowerCase()}`;
  const feedbackHash = keccak256(toHex(`${trade.id}_${tag}`));

  const comment = JSON.stringify({
    tradeId:   trade.id,
    question:  trade.question.slice(0, 50),
    direction: trade.direction,
    edge:      trade.aiEdge,
    betUSD:    trade.betUSD,
    pnl:       trade.pnl ?? "pending",
  });

  // Pakai Circle SDK — treasury wallet sebagai validator
  const tx = await executeContract(
    process.env.CIRCLE_TREASURY_WALLET_ID,
    REPUTATION_REGISTRY,
    "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
    [
      AGENT_ID,
      score.toString(),
      "0",
      tag,
      "",
      "",
      comment,
      feedbackHash,
    ]
  );

  return {
    txHash:   tx.txHash,
    score,
    tag,
    explorer: `https://testnet.arcscan.app/tx/${tx.txHash}`,
    via:      "Circle Developer Wallets SDK",
  };
}
