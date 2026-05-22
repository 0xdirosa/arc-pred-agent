import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { v4 as uuidv4 } from "uuid";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

/**
 * Buat wallet set + 2 wallets di Arc Testnet
 * Owner wallet: untuk agent operations
 * Treasury wallet: untuk track USDC settlement
 */
export async function createAgentWallets() {
  const walletSet = await client.createWalletSet({
    name: "Arc Pred Agent Wallets",
    idempotencyKey: uuidv4(),
  });

  const walletSetId = walletSet.data?.walletSet?.id;
  if (!walletSetId) throw new Error("Failed to create wallet set");

  const walletsRes = await client.createWallets({
    blockchains: ["ARC-TESTNET"],
    count: 2,
    walletSetId,
    accountType: "SCA",
    idempotencyKey: uuidv4(),
  });

  const wallets = walletsRes.data?.wallets ?? [];
  if (wallets.length < 2) throw new Error("Failed to create wallets");

  return {
    walletSetId,
    agentWallet:    wallets[0],
    treasuryWallet: wallets[1],
  };
}

/**
 * Cek balance USDC di wallet
 */
export async function getWalletBalance(walletId) {
  const res = await client.getWalletTokenBalance({ id: walletId });
  const balances = res.data?.tokenBalances ?? [];
  const usdc = balances.find((b) =>
    b.token?.symbol === "USDC" || b.token?.name?.includes("USD")
  );
  return {
    usdc:    parseFloat(usdc?.amount ?? "0"),
    all:     balances,
  };
}

/**
 * Transfer USDC antar wallet di Arc
 */
export async function transferUSDC(fromWalletId, toAddress, amountUSDC) {
  const res = await client.createTransaction({
    walletId: fromWalletId,
    tokenAddress: "0x",        // native USDC di Arc
    destinationAddress: toAddress,
    amounts: [amountUSDC.toString()],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: uuidv4(),
  });

  const txId = res.data?.id;
  if (!txId) throw new Error("Transaction creation failed");

  // Poll sampai complete
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await client.getTransaction({ id: txId });
    const state = tx.data?.transaction?.state;

    if (state === "COMPLETE") return tx.data.transaction;
    if (["FAILED", "DENIED", "CANCELLED"].includes(state)) {
      throw new Error(`Transaction ${state}`);
    }
  }

  throw new Error("Transaction timed out");
}

/**
 * Execute contract di Arc via Circle SDK
 * Dipakai untuk interact dengan ERC-8004 contracts
 */
export async function executeContract(walletId, contractAddress, abiFunctionSignature, abiParameters) {
  const res = await client.createContractExecutionTransaction({
    walletId,
    contractAddress,
    blockchain: "ARC-TESTNET",
    abiFunctionSignature,
    abiParameters,
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: uuidv4(),
  });

  const txId = res.data?.id;
  if (!txId) throw new Error("Contract execution failed");

  // Poll sampai complete
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await client.getTransaction({ id: txId });
    const state = tx.data?.transaction?.state;

    if (state === "COMPLETE") return tx.data.transaction;
    if (["FAILED", "DENIED", "CANCELLED"].includes(state)) {
      throw new Error(`Transaction ${state}: ${tx.data?.transaction?.errorReason ?? ""}`);
    }
  }

  throw new Error("Contract execution timed out");
}

/**
 * Get wallet info
 */
export async function getWalletInfo(walletId) {
  const res = await client.getWallet({ id: walletId });
  return res.data?.wallet;
}

export { client };
