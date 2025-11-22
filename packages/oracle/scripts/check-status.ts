
import { getEscrowStatus } from "../src/services/escrow.js";
import { ENV } from "../src/config/env.js";
import { getNetwork } from "../src/config/networks.js";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: pnpm check-status <CODE> [--watch]");
  process.exit(1);
}

const code = args[0];
const watchMode = args.includes("--watch");

async function displayStatus() {
  try {
    console.clear();
    console.log(`🔍 Checking status for escrow code: ${code}`);
    console.log(`   Time: ${new Date().toLocaleTimeString()}`);
    console.log(`   Network: ${ENV.CHAIN_ID} (${getNetwork(ENV.CHAIN_ID).name})\n`);

    const status = await getEscrowStatus(code);

    const phaseEmoji = ["🟡", "🔵", "🟢", "🏁"][status.phase] || "❓";
    
    console.log(`   Phase: ${phaseEmoji} ${status.phaseName} (${status.phase})`);
    console.log(`   ----------------------------------------`);
    console.log(`   📝 Contract:  ${status.escrow}`);
    console.log(`   👤 Funder:    ${status.funder || "(waiting)"}`);
    console.log(`      Expected:  ${status.expectedFunder || "(any)"}`);
    console.log(`   🤝 Confirmer: ${status.confirmer || "(waiting)"}`);
    console.log(`      Expected:  ${status.expectedConfirmer || "(any)"}`);
    console.log(`   ----------------------------------------`);
    
    // If we added amount fetching to getEscrowStatus, we could show it here.
    // For now, phase is the most critical indicator.

    if (status.phase === 0) {
      console.log(`\n   👉 Action Needed: Waiting for CONFIRMATION transfer.`);
    } else if (status.phase === 1) {
      console.log(`\n   👉 Action Needed: Waiting for FUNDING transfer.`);
    } else if (status.phase === 2) {
      console.log(`\n   👉 Action Needed: Ready for RESOLUTION (Pay/Refund).`);
    } else if (status.phase === 3) {
      console.log(`\n   ✅ Contract is RESOLVED.`);
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

if (watchMode) {
  displayStatus();
  setInterval(displayStatus, 3000);
} else {
  displayStatus().then(() => process.exit(0));
}

