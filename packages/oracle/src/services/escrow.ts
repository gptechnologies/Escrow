/**
 * Escrow service functions - interact with smart contracts
 */

import { encodeFunctionData, decodeFunctionResult, parseEventLogs } from "viem";
import { publicClient, walletClient, oracleAccount } from "../blockchain/client.js";
import { EscrowFactoryABI, EscrowABI } from "../contracts/abis.js";
import { getNetwork } from "../config/networks.js";
import { ENV } from "../config/env.js";
import { sql, hexToBuffer, bufferToHex } from "../db/client.js";
import { nanoid } from "nanoid";
import { nonceManager, retryWithBackoff } from "../blockchain/nonce-manager.js";

const network = getNetwork(ENV.CHAIN_ID);

/**
 * Create a new escrow via EscrowFactory
 */
export async function createEscrow(params: {
  targetAmount: bigint;
  confirmationAmount: bigint;
  deadline: number;
  tweetId: number;
  expectedFunder: `0x${string}`;
}): Promise<{ escrow: string; code: string; txHash: string }> {
  
  const code = nanoid(10); // Generate unique 10-char code

  // Prepare transaction
  const data = encodeFunctionData({
    abi: EscrowFactoryABI,
    functionName: "createEscrow",
    args: [{
      token: network.USDC as `0x${string}`,
      targetAmount: params.targetAmount,
      confirmationAmount: params.confirmationAmount,
      deadline: BigInt(params.deadline),
      tweetId: BigInt(params.tweetId),
      expectedFunder: params.expectedFunder,
    }],
  });

  // Send transaction with retry
  const txHash = await retryWithBackoff(async () => {
    const nonce = await nonceManager.getNonce();
    
    const hash = await walletClient.sendTransaction({
      to: network.FACTORY as `0x${string}`,
      data,
      nonce,
      account: oracleAccount,
    });

    nonceManager.increment();
    return hash;
  }, 3, 1000, "createEscrow");

  console.log(`📝 Escrow creation tx sent: ${txHash}`);

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  // Parse EscrowCreated event
  const logs = parseEventLogs({
    abi: EscrowFactoryABI,
    logs: receipt.logs,
    eventName: "EscrowCreated",
  });

  if (logs.length === 0) {
    throw new Error("EscrowCreated event not found in receipt");
  }

  const escrowAddress = logs[0].args.escrow as string;

  // Store in database
  await sql`
    INSERT INTO escrows (escrow, code, network, expected_funder, phase_cached, created_tx)
    VALUES (
      ${hexToBuffer(escrowAddress)},
      ${code},
      ${ENV.CHAIN_ID.toString()},
      ${hexToBuffer(params.expectedFunder)},
      0,
      ${txHash}
    )
  `;

  console.log(`✅ Escrow created: ${escrowAddress} (code: ${code})`);

  return {
    escrow: escrowAddress,
    code,
    txHash,
  };
}

/**
 * Bind an address to an escrow (set expectedConfirmer)
 */
export async function bindAddress(params: {
  code: string;
  role: "FUNDER" | "CONFIRMER";
  address: `0x${string}`;
  confirmBy?: number;
}): Promise<{ escrow: string; txHash: string }> {
  
  // Look up escrow by code
  const rows = await sql`
    SELECT escrow FROM escrows WHERE code = ${params.code}
  `;

  if (rows.length === 0) {
    throw new Error(`Escrow not found for code: ${params.code}`);
  }

  const escrowAddress = bufferToHex(rows[0].escrow as Buffer);

  if (params.role === "CONFIRMER") {
    // Call setExpectedConfirmer
    const data = encodeFunctionData({
      abi: EscrowABI,
      functionName: "setExpectedConfirmer",
      args: [params.address, BigInt(params.confirmBy || 0)],
    });

    const txHash = await retryWithBackoff(async () => {
      const nonce = await nonceManager.getNonce();
      
      const hash = await walletClient.sendTransaction({
        to: escrowAddress as `0x${string}`,
        data,
        nonce,
        account: oracleAccount,
      });

      nonceManager.increment();
      return hash;
    }, 3, 1000, "bindAddress");

    console.log(`📝 Bind confirmer tx sent: ${txHash}`);

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Update database
    await sql`
      UPDATE escrows
      SET expected_confirmer = ${hexToBuffer(params.address)}, updated_at = NOW()
      WHERE code = ${params.code}
    `;

    console.log(`✅ Confirmer bound: ${params.address} for ${escrowAddress}`);

    return { escrow: escrowAddress, txHash };
  } else {
    // FUNDER role - just update DB (already set on creation)
    await sql`
      UPDATE escrows
      SET expected_funder = ${hexToBuffer(params.address)}, updated_at = NOW()
      WHERE code = ${params.code}
    `;
    
    return { escrow: escrowAddress, txHash: "0x0" }; // No on-chain tx needed
  }
}

/**
 * Get escrow status
 */
export async function getEscrowStatus(code: string): Promise<{
  escrow: string;
  code: string;
  phase: number;
  phaseName: string;
  expectedFunder: string | null;
  expectedConfirmer: string | null;
  funder: string | null;
  confirmer: string | null;
}> {
  
  // Look up in DB
  const rows = await sql`
    SELECT escrow, expected_funder, expected_confirmer FROM escrows WHERE code = ${code}
  `;

  if (rows.length === 0) {
    throw new Error(`Escrow not found for code: ${code}`);
  }

  const escrowAddress = bufferToHex(rows[0].escrow as Buffer);

  // Read phase from chain
  const phase = await publicClient.readContract({
    address: escrowAddress as `0x${string}`,
    abi: EscrowABI,
    functionName: "phase",
  });

  // Read addresses from chain
  const [expectedFunder, expectedConfirmer, funder, confirmer] = await Promise.all([
    publicClient.readContract({
      address: escrowAddress as `0x${string}`,
      abi: EscrowABI,
      functionName: "expectedFunder",
    }),
    publicClient.readContract({
      address: escrowAddress as `0x${string}`,
      abi: EscrowABI,
      functionName: "expectedConfirmer",
    }),
    publicClient.readContract({
      address: escrowAddress as `0x${string}`,
      abi: EscrowABI,
      functionName: "funder",
    }),
    publicClient.readContract({
      address: escrowAddress as `0x${string}`,
      abi: EscrowABI,
      functionName: "confirmer",
    }),
  ]);

  const phaseNames = ["AwaitingConfirmation", "ConfirmedAwaitingFunding", "Funded", "Resolved"];

  return {
    escrow: escrowAddress,
    code,
    phase: Number(phase),
    phaseName: phaseNames[Number(phase)] || "Unknown",
    expectedFunder: expectedFunder === "0x0000000000000000000000000000000000000000" ? null : expectedFunder,
    expectedConfirmer: expectedConfirmer === "0x0000000000000000000000000000000000000000" ? null : expectedConfirmer,
    funder: funder === "0x0000000000000000000000000000000000000000" ? null : funder,
    confirmer: confirmer === "0x0000000000000000000000000000000000000000" ? null : confirmer,
  };
}

/**
 * Resolve escrow (PAY or REFUND)
 */
export async function resolveEscrow(params: {
  code: string;
  action: "PAY" | "REFUND";
  pollId?: number;
  creatorEvidence?: string;
  confirmerEvidence?: string;
}): Promise<{ escrow: string; txHash: string }> {
  
  // Look up escrow
  const rows = await sql`
    SELECT escrow FROM escrows WHERE code = ${params.code}
  `;

  if (rows.length === 0) {
    throw new Error(`Escrow not found for code: ${params.code}`);
  }

  const escrowAddress = bufferToHex(rows[0].escrow as Buffer);

  let data: `0x${string}`;

  if (params.action === "PAY" && params.creatorEvidence && params.confirmerEvidence) {
    // Mutual DM consent
    data = encodeFunctionData({
      abi: EscrowABI,
      functionName: "resolveByMutualDMConsent",
      args: [params.creatorEvidence as `0x${string}`, params.confirmerEvidence as `0x${string}`],
    });
  } else {
    // Standard resolve with poll
    data = encodeFunctionData({
      abi: EscrowABI,
      functionName: "resolve",
      args: [params.action === "PAY", BigInt(params.pollId || 0)],
    });
  }

  const txHash = await retryWithBackoff(async () => {
    const nonce = await nonceManager.getNonce();
    
    const hash = await walletClient.sendTransaction({
      to: escrowAddress as `0x${string}`,
      data,
      nonce,
      account: oracleAccount,
    });

    nonceManager.increment();
    return hash;
  }, 3, 1000, "resolveEscrow");

  console.log(`📝 Resolve tx sent: ${txHash} (${params.action})`);

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Update phase cache
  await sql`
    UPDATE escrows
    SET phase_cached = 3, updated_at = NOW()
    WHERE code = ${params.code}
  `;

  console.log(`✅ Escrow resolved: ${escrowAddress} (${params.action})`);

  return { escrow: escrowAddress, txHash };
}

/**
 * Record a confirmation (phase 0 -> 1)
 */
export async function recordConfirmation(params: {
  escrow: `0x${string}`;
  confirmer: `0x${string}`;
  amount: string;
  txHash: string; // The USDC transfer hash
}): Promise<string> {
  const data = encodeFunctionData({
    abi: EscrowABI,
    functionName: "recordConfirmation",
    args: [params.confirmer, BigInt(params.amount), params.txHash as `0x${string}`],
  });

  const txHash = await retryWithBackoff(async () => {
    const nonce = await nonceManager.getNonce();
    
    const hash = await walletClient.sendTransaction({
      to: params.escrow,
      data,
      nonce,
      account: oracleAccount,
    });

    nonceManager.increment();
    return hash;
  }, 3, 1000, "recordConfirmation");

  console.log(`📝 Record confirmation tx sent: ${txHash}`);
  return txHash;
}

/**
 * Record funding (phase 1 -> 2)
 */
export async function recordFunding(params: {
  escrow: `0x${string}`;
  funder: `0x${string}`;
  amount: string;
  txHash: string; // The USDC transfer hash
}): Promise<string> {
  const data = encodeFunctionData({
    abi: EscrowABI,
    functionName: "recordFunding",
    args: [params.funder, BigInt(params.amount), params.txHash as `0x${string}`],
  });

  const txHash = await retryWithBackoff(async () => {
    const nonce = await nonceManager.getNonce();
    
    const hash = await walletClient.sendTransaction({
      to: params.escrow,
      data,
      nonce,
      account: oracleAccount,
    });

    nonceManager.increment();
    return hash;
  }, 3, 1000, "recordFunding");

  console.log(`📝 Record funding tx sent: ${txHash}`);
  return txHash;
}
