import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, http, keccak256, toHex, parseUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { v4 as uuidv4 } from "uuid";

const AGENTIC_COMMERCE_CONTRACT = "0x0747EEf0706327138c69792bF28Cd525089e4583";
const USDC_CONTRACT             = "0x3600000000000000000000000000000000000000";
const JOB_BUDGET                = parseUnits("1", 6);

const client = initiateDeveloperControlledWalletsClient({
  apiKey:       process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

const publicClient = createPublicClient({
  chain:     arcTestnet,
  transport: http(),
});

const STATUS_NAMES = ["Open", "Funded", "Submitted", "Completed", "Cancelled"];

// JobCreated event topic signature
const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9";

const agenticCommerceAbi = [
  {
    type: "function", name: "createJob", stateMutability: "nonpayable",
    inputs: [
      { name: "provider",    type: "address" },
      { name: "evaluator",   type: "address" },
      { name: "expiredAt",   type: "uint256" },
      { name: "description", type: "string"  },
      { name: "hook",        type: "address" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    type: "function", name: "setBudget", stateMutability: "nonpayable",
    inputs: [
      { name: "jobId",     type: "uint256" },
      { name: "amount",    type: "uint256" },
      { name: "optParams", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    type: "function", name: "fund", stateMutability: "nonpayable",
    inputs: [
      { name: "jobId",     type: "uint256" },
      { name: "optParams", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    type: "function", name: "submit", stateMutability: "nonpayable",
    inputs: [
      { name: "jobId",       type: "uint256" },
      { name: "deliverable", type: "bytes32" },
      { name: "optParams",   type: "bytes"   },
    ],
    outputs: [],
  },
  {
    type: "function", name: "complete", stateMutability: "nonpayable",
    inputs: [
      { name: "jobId",     type: "uint256" },
      { name: "reason",    type: "bytes32" },
      { name: "optParams", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    type: "function", name: "getJob", stateMutability: "view",
    inputs:  [{ name: "jobId", type: "uint256" }],
    outputs: [
      { name: "client",      type: "address" },
      { name: "provider",    type: "address" },
      { name: "evaluator",   type: "address" },
      { name: "expiredAt",   type: "uint256" },
      { name: "description", type: "string"  },
      { name: "budget",      type: "uint256" },
      { name: "deliverable", type: "bytes32" },
      { name: "status",      type: "uint8"   },
      { name: "hook",        type: "address" },
    ],
  },
];

async function waitForCircleTx(txId, label) {
  process.stdout.write(`  ⏳ ${label}`);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res   = await client.getTransaction({ id: txId });
    const state = res.data?.transaction?.state;
    if (state === "COMPLETE") {
      console.log(` ✅`);
      return res.data.transaction;
    }
    if (["FAILED", "DENIED", "CANCELLED"].includes(state)) {
      throw new Error(`${label} ${state}: ${res.data?.transaction?.errorReason ?? ""}`);
    }
    process.stdout.write(".");
  }
  throw new Error(`${label} timed out`);
}

export async function runJobLifecycle(sessionSummary) {
  const clientWalletId   = process.env.CIRCLE_AGENT_WALLET_ID;
  const providerWalletId = process.env.CIRCLE_TREASURY_WALLET_ID;
  const clientAddress    = process.env.CIRCLE_AGENT_WALLET_ADDRESS;
  const providerAddress  = process.env.CIRCLE_TREASURY_WALLET_ADDRESS;

  console.log("\n🔄 ERC-8183 Job Settlement");
  console.log("─".repeat(50));

  // Step 1: Create Job
  console.log("  📝 Step 1: Creating job...");
  const expiredAt   = Math.floor(Date.now() / 1000) + 86400;
  const description = `Pred market analysis: ${sessionSummary.betsPlaced} bets, ${sessionSummary.markets} markets scanned`;

  const createJobRes = await client.createContractExecutionTransaction({
    walletId:             clientWalletId,
    blockchain:           "ARC-TESTNET",
    contractAddress:      AGENTIC_COMMERCE_CONTRACT,
    abiFunctionSignature: "createJob(address,address,uint256,string,address)",
    abiParameters: [
      providerAddress,
      clientAddress,
      expiredAt.toString(),
      description,
      "0x0000000000000000000000000000000000000000",
    ],
    fee:            { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: uuidv4(),
  });

  const createTx = await waitForCircleTx(createJobRes.data?.id, "Create job");
  console.log(`  🔗 TX: https://testnet.arcscan.app/tx/${createTx.txHash}`);

  // Ambil jobId dari topic[1] log JobCreated
  const receipt = await publicClient.getTransactionReceipt({ hash: createTx.txHash });
  const jobLog  = receipt.logs.find(
    (l) => l.address.toLowerCase() === AGENTIC_COMMERCE_CONTRACT.toLowerCase() &&
           l.topics[0] === JOB_CREATED_TOPIC
  );

  if (!jobLog) throw new Error("JobCreated log not found");
  const jobId = BigInt(jobLog.topics[1]);
  console.log(`  🪪  Job ID: ${jobId}`);

  // Step 2: Set Budget
  console.log("  💰 Step 2: Setting budget (1 USDC)...");
  const setBudgetRes = await client.createContractExecutionTransaction({
    walletId:             providerWalletId,
    blockchain:           "ARC-TESTNET",
    contractAddress:      AGENTIC_COMMERCE_CONTRACT,
    abiFunctionSignature: "setBudget(uint256,uint256,bytes)",
    abiParameters:        [jobId.toString(), JOB_BUDGET.toString(), "0x"],
    fee:                  { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey:       uuidv4(),
  });
  await waitForCircleTx(setBudgetRes.data?.id, "Set budget");

  // Step 3: Approve USDC
  console.log("  ✅ Step 3: Approving USDC...");
  const approveRes = await client.createContractExecutionTransaction({
    walletId:             clientWalletId,
    blockchain:           "ARC-TESTNET",
    contractAddress:      USDC_CONTRACT,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters:        [AGENTIC_COMMERCE_CONTRACT, JOB_BUDGET.toString()],
    fee:                  { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey:       uuidv4(),
  });
  await waitForCircleTx(approveRes.data?.id, "Approve USDC");

  // Step 4: Fund escrow
  console.log("  💸 Step 4: Funding escrow...");
  const fundRes = await client.createContractExecutionTransaction({
    walletId:             clientWalletId,
    blockchain:           "ARC-TESTNET",
    contractAddress:      AGENTIC_COMMERCE_CONTRACT,
    abiFunctionSignature: "fund(uint256,bytes)",
    abiParameters:        [jobId.toString(), "0x"],
    fee:                  { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey:       uuidv4(),
  });
  await waitForCircleTx(fundRes.data?.id, "Fund escrow");

  // Step 5: Submit deliverable
  console.log("  📤 Step 5: Submitting deliverable...");
  const deliverableHash = keccak256(toHex(JSON.stringify({
    sessionId:  Date.now(),
    betsPlaced: sessionSummary.betsPlaced,
    markets:    sessionSummary.markets,
    agentId:    process.env.ARC_AGENT_ID,
    timestamp:  new Date().toISOString(),
  })));

  const submitRes = await client.createContractExecutionTransaction({
    walletId:             providerWalletId,
    blockchain:           "ARC-TESTNET",
    contractAddress:      AGENTIC_COMMERCE_CONTRACT,
    abiFunctionSignature: "submit(uint256,bytes32,bytes)",
    abiParameters:        [jobId.toString(), deliverableHash, "0x"],
    fee:                  { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey:       uuidv4(),
  });
  await waitForCircleTx(submitRes.data?.id, "Submit deliverable");

  // Step 6: Complete job
  console.log("  🏁 Step 6: Completing job...");
  const reasonHash = keccak256(toHex("analysis-approved"));

  const completeRes = await client.createContractExecutionTransaction({
    walletId:             clientWalletId,
    blockchain:           "ARC-TESTNET",
    contractAddress:      AGENTIC_COMMERCE_CONTRACT,
    abiFunctionSignature: "complete(uint256,bytes32,bytes)",
    abiParameters:        [jobId.toString(), reasonHash, "0x"],
    fee:                  { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey:       uuidv4(),
  });
  const completeTx = await waitForCircleTx(completeRes.data?.id, "Complete job");

  // Step 7: Confirm complete
  console.log(`\n  ✅ Job ${jobId} — Completed`);
  console.log(`  💰 Budget settled: 1 USDC`);
  console.log(`  🔗 https://testnet.arcscan.app/tx/${completeTx.txHash}`);

  return {
    jobId:          jobId.toString(),
    status:         "Completed",
    deliverableHash,
    completeTxHash: completeTx.txHash,
    explorer:       `https://testnet.arcscan.app/tx/${completeTx.txHash}`,
  };
}
