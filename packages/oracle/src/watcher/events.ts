/**
 * Event watcher - WSS subscriptions + HTTP backfill
 */

import { parseEventLogs, Log } from "viem";
import { wsClient, publicClient } from "../blockchain/client.js";
import { EscrowFactoryABI, EscrowABI, ERC20ABI } from "../contracts/abis.js";
import { getNetwork } from "../config/networks.js";
import { ENV } from "../config/env.js";
import { sql, hexToBuffer, bufferToHex } from "../db/client.js";
import { getEscrowQueue, createEscrowWorker } from "./queue.js";
import { processEscrowJob } from "./processor.js";
import { Worker } from "bullmq";

const network = getNetwork(ENV.CHAIN_ID);

// Active escrow addresses we're watching
const activeEscrows = new Set<string>();
const activeWorkers = new Map<string, Worker>();

/**
 * Initialize active escrow set from database
 */
async function loadActiveEscrows() {
  const rows = await sql`
    SELECT escrow FROM escrows
    WHERE network = ${ENV.CHAIN_ID.toString()}
    AND phase_cached < 3
  `;

  rows.forEach((row) => {
    const addr = bufferToHex(row.escrow as Buffer).toLowerCase();
    activeEscrows.add(addr);
  });

  console.log(`📊 Loaded ${activeEscrows.size} active escrows`);
}

/**
 * Add escrow to active set
 */
export function addActiveEscrow(address: string) {
  const addr = address.toLowerCase();
  if (!activeEscrows.has(addr)) {
    activeEscrows.add(addr);
    
    // Start worker
    if (!activeWorkers.has(addr)) {
      console.log(`👷 Starting worker for ${addr}`);
      const worker = createEscrowWorker(addr, processEscrowJob);
      activeWorkers.set(addr, worker);
    }
  }
}

/**
 * Remove escrow from active set (when resolved)
 */
export function removeActiveEscrow(address: string) {
  const addr = address.toLowerCase();
  activeEscrows.delete(addr);

  // Stop worker
  const worker = activeWorkers.get(addr);
  if (worker) {
    console.log(`🛑 Stopping worker for ${addr}`);
    worker.close();
    activeWorkers.delete(addr);
  }
}

/**
 * Check if transaction was already processed
 */
async function isProcessed(txHash: string, escrow: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM processed_tx
    WHERE tx_hash = ${txHash} AND escrow = ${hexToBuffer(escrow)}
  `;
  return rows.length > 0;
}

/**
 * Mark transaction as processed
 */
async function markProcessed(txHash: string, escrow: string, eventType: string) {
  await sql`
    INSERT INTO processed_tx (tx_hash, escrow, event_type)
    VALUES (${txHash}, ${hexToBuffer(escrow)}, ${eventType})
    ON CONFLICT (tx_hash) DO NOTHING
  `;
}

/**
 * Process EscrowFactory.EscrowCreated event
 */
async function handleEscrowCreated(log: any) {
  const escrowAddress = log.args.escrow.toLowerCase();
  
  console.log(`🆕 EscrowCreated: ${escrowAddress}`);
  
  addActiveEscrow(escrowAddress);
}

/**
 * Process USDC Transfer events to active escrows
 */
async function handleUSDCTransfer(log: any, escrowAddress: string) {
  const { from, to, value } = log.args;
  
  if (await isProcessed(log.transactionHash, escrowAddress)) {
    console.log(`⏭️  Already processed: ${log.transactionHash}`);
    return;
  }

  console.log(`💸 Transfer to ${escrowAddress}: ${value.toString()} from ${from}`);

  // Queue job to check if this needs recording
  const queue = getEscrowQueue(escrowAddress);
  await queue.add("transfer", {
    escrow: escrowAddress,
    eventType: "Transfer",
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
    args: { from, to, value: value.toString() },
  });

  await markProcessed(log.transactionHash, escrowAddress, "Transfer");
}

/**
 * Process Escrow events (ConfirmationRecorded, FundingRecorded, Resolved, etc.)
 */
async function handleEscrowEvent(log: any, eventName: string) {
  const escrowAddress = (log.address as string).toLowerCase();
  
  if (await isProcessed(log.transactionHash, escrowAddress)) {
    console.log(`⏭️  Already processed: ${log.transactionHash}`);
    return;
  }

  console.log(`📢 ${eventName} on ${escrowAddress}`);

  // Update phase cache if it's a phase-changing event
  if (["ConfirmationRecorded", "FundingRecorded", "ResolvedPaid", "ResolvedRefunded", "ResolvedPaidByConsent"].includes(eventName)) {
    const phaseMap: Record<string, number> = {
      "ConfirmationRecorded": 1,
      "FundingRecorded": 2,
      "ResolvedPaid": 3,
      "ResolvedRefunded": 3,
      "ResolvedPaidByConsent": 3,
    };

    const newPhase = phaseMap[eventName];
    await sql`
      UPDATE escrows
      SET phase_cached = ${newPhase}, updated_at = NOW()
      WHERE escrow = ${hexToBuffer(escrowAddress)}
    `;

    if (newPhase === 3) {
      removeActiveEscrow(escrowAddress);
    }
  }

  await markProcessed(log.transactionHash, escrowAddress, eventName);
}

/**
 * Start WebSocket subscriptions
 */
export async function startWSS() {
  await loadActiveEscrows();

  // Start workers for all initial active escrows
  for (const escrow of activeEscrows) {
    if (!activeWorkers.has(escrow)) {
      console.log(`👷 Starting worker for ${escrow}`);
      const worker = createEscrowWorker(escrow, processEscrowJob);
      activeWorkers.set(escrow, worker);
    }
  }

  console.log(`✅ Started ${activeWorkers.size} workers`);

  console.log("🔌 Starting WebSocket subscriptions...");

  // Subscribe to EscrowFactory.EscrowCreated
  wsClient.watchEvent({
    address: network.FACTORY as `0x${string}`,
    event: {
      type: "event",
      name: "EscrowCreated",
      inputs: EscrowFactoryABI[0].inputs,
    },
    onLogs: async (logs) => {
      for (const log of logs) {
        await handleEscrowCreated(log);
      }
    },
    onError: (error) => {
      console.error("❌ WSS EscrowCreated error:", error);
    },
  });

  // Subscribe to USDC transfers to active escrows
  // Note: We'll poll for these in backfill since topic filter with OR is complex
  
  console.log("✅ WSS subscriptions active");
}

/**
 * HTTP backfill loop
 */
export async function startBackfill() {
  const intervalMs = network.backfillIntervalMs;
  
  console.log(`🔄 Starting backfill loop (every ${intervalMs}ms)...`);

  async function backfillRound() {
    try {
      // Get last processed block
      const cursorRows = await sql`
        SELECT last_block FROM cursor WHERE network = ${ENV.CHAIN_ID.toString()}
      `;

      const fromBlock = cursorRows.length > 0 ? BigInt(cursorRows[0].last_block) + 1n : 0n;
      const latestBlock = await publicClient.getBlockNumber();
      const toBlock = latestBlock - BigInt(network.blockConfirmations);

      if (fromBlock > toBlock) {
        // Nothing to backfill
        return;
      }

      console.log(`🔍 Backfilling blocks ${fromBlock} → ${toBlock}`);

      // Fetch EscrowFactory events
      const factoryLogs = await publicClient.getLogs({
        address: network.FACTORY as `0x${string}`,
        event: EscrowFactoryABI[0],
        fromBlock,
        toBlock,
      });

      for (const log of factoryLogs) {
        await handleEscrowCreated(log);
      }

      // Fetch USDC Transfer events to active escrows
      if (activeEscrows.size > 0) {
        const escrowArray = Array.from(activeEscrows);
        
        // Chunk if too many (>800 addresses can hit RPC limits)
        const chunkSize = 500;
        for (let i = 0; i < escrowArray.length; i += chunkSize) {
          const chunk = escrowArray.slice(i, i + chunkSize);
          
          const transferLogs = await publicClient.getLogs({
            address: network.USDC as `0x${string}`,
            event: ERC20ABI[0],
            args: {
              to: chunk as `0x${string}`[],
            },
            fromBlock,
            toBlock,
          });

          for (const log of transferLogs) {
            const escrowAddr = (log.args.to as string).toLowerCase();
            await handleUSDCTransfer(log, escrowAddr);
          }
        }
      }

      // Fetch Escrow events from active escrows
      for (const escrowAddr of activeEscrows) {
        const escrowLogs = await publicClient.getLogs({
          address: escrowAddr as `0x${string}`,
          fromBlock,
          toBlock,
        });

        for (const log of escrowLogs) {
          // Parse event name from topics
          const parsed = parseEventLogs({
            abi: EscrowABI,
            logs: [log],
          });

          if (parsed.length > 0) {
            await handleEscrowEvent(parsed[0], parsed[0].eventName as string);
          }
        }
      }

      // Update cursor
      await sql`
        INSERT INTO cursor (network, last_block, updated_at)
        VALUES (${ENV.CHAIN_ID.toString()}, ${toBlock.toString()}, NOW())
        ON CONFLICT (network) DO UPDATE SET last_block = ${toBlock.toString()}, updated_at = NOW()
      `;

      console.log(`✅ Backfill complete: cursor at block ${toBlock}`);
    } catch (error) {
      console.error("❌ Backfill error:", error);
    }
  }

  // Run immediately, then on interval
  await backfillRound();
  setInterval(backfillRound, intervalMs);
}
