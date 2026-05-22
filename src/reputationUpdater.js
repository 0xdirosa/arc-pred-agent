import { createWalletClient, createPublicClient, http, keccak256, toHex, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const AGENT_ID = BigInt(process.env.ARC_AGENT_ID ?? "18005");

const validatorAccount = privateKeyToAccount(process.env.VALIDATOR_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const validatorClient = createWalletClient({
  account: validatorAccount,
  chain: arcTestnet,
  transport: http(),
});

const reputationAbi = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId",      type: "uint256" },
      { name: "score",        type: "int128"  },
      { name: "feedbackType", type: "uint8"   },
      { name: "tag",          type: "string"  },
      { name: "metadataURI",  type: "string"  },
      { name: "evidenceURI",  type: "string"  },
      { name: "comment",      type: "string"  },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
];

/**
 * Hitung reputation score berdasarkan hasil trade
 * Score 0-100
 */
function calculateScore(trade) {
  if (trade.status === "WIN")  return 90;
  if (trade.status === "LOSS") return 40;

  // Open trade — score berdasarkan edge
  const edge = trade.aiEdge ?? 0;
  if (edge > 10) return 80;
  if (edge > 5)  return 70;
  return 60;
}

/**
 * Record trade ke ReputationRegistry di Arc
 */
export async function recordTradeReputation(trade) {
  const score = calculateScore(trade);
  const tag   = `pred_market_${trade.status.toLowerCase()}`;
  const feedbackHash = keccak256(toHex(`${trade.id}_${tag}`));

  const comment = JSON.stringify({
    tradeId:   trade.id,
    question:  trade.question.slice(0, 50),
    direction: trade.direction,
    edge:      trade.aiEdge,
    betUSD:    trade.betUSD,
    pnl:       trade.pnl ?? "pending",
  });

  const tx = await validatorClient.writeContract({
    address: REPUTATION_REGISTRY,
    abi: reputationAbi,
    functionName: "giveFeedback",
    args: [AGENT_ID, BigInt(score), 0, tag, "", "", comment, feedbackHash],
    account: validatorAccount,
  });

  await publicClient.waitForTransactionReceipt({ hash: tx });

  return {
    txHash: tx,
    score,
    tag,
    explorer: `https://testnet.arcscan.app/tx/${tx}`,
  };
}
