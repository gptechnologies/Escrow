/**
 * Event processor logic
 */

import { EscrowJobData } from "./queue.js";
import { publicClient } from "../blockchain/client.js";
import { EscrowABI } from "../contracts/abis.js";
import { recordConfirmation, recordFunding } from "../services/escrow.js";

export async function processEscrowJob(data: EscrowJobData) {
  const { escrow, eventType, args, txHash } = data;

  if (eventType === "Transfer") {
    // This is a USDC transfer to the escrow
    // We need to check if it matches confirmation or funding requirements
    
    // 1. Get current state
    const [phase, confirmationAmount, targetAmount] = await Promise.all([
      publicClient.readContract({
        address: escrow as `0x${string}`,
        abi: EscrowABI,
        functionName: "phase",
      }),
      publicClient.readContract({
        address: escrow as `0x${string}`,
        abi: EscrowABI,
        functionName: "confirmationAmount",
      }),
      publicClient.readContract({
        address: escrow as `0x${string}`,
        abi: EscrowABI,
        functionName: "targetAmount",
      }),
    ]);

    const transferAmount = BigInt(args.value);
    const from = args.from as `0x${string}`;

    console.log(`🔍 Analyzing transfer of ${transferAmount} to ${escrow} (Phase: ${phase})`);

    // Phase 0: AwaitingConfirmation
    if (phase === 0) {
      if (transferAmount === confirmationAmount) {
        console.log(`🎯 Exact match for confirmation amount! Recording confirmation...`);
        await recordConfirmation({
          escrow: escrow as `0x${string}`,
          confirmer: from,
          amount: transferAmount.toString(),
          txHash: txHash,
        });
      } else {
        console.log(`⚠️ Transfer amount ${transferAmount} != confirmation amount ${confirmationAmount}. Ignoring.`);
      }
    } 
    // Phase 1: ConfirmedAwaitingFunding
    else if (phase === 1) {
      if (transferAmount >= targetAmount) {
        console.log(`🎯 Met target amount! Recording funding...`);
        await recordFunding({
          escrow: escrow as `0x${string}`,
          funder: from,
          amount: transferAmount.toString(),
          txHash: txHash,
        });
      } else {
        console.log(`⚠️ Transfer amount ${transferAmount} < target amount ${targetAmount}. Ignoring.`);
      }
    }
    else {
      console.log(`ℹ️ Escrow in phase ${phase}, ignoring transfer.`);
    }
  }
}

