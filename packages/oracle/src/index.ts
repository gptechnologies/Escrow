/**
 * Escrow Oracle Service
 * Main entry point
 */

import express from "express";
import { ENV } from "./config/env.js";
import routes from "./api/routes.js";
import { errorHandler } from "./api/middleware.js";
import { startWSS, startBackfill } from "./watcher/events.js";

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/", routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(ENV.PORT, () => {
  console.log(`\n🚀 Oracle API listening on port ${ENV.PORT}`);
  console.log(`   Environment: ${ENV.NODE_ENV}`);
  console.log(`   Chain ID: ${ENV.CHAIN_ID}`);
  console.log(`   Factory: ${ENV.FACTORY_ADDRESS}`);
  console.log(`   USDC: ${ENV.USDC_ADDRESS}`);
  console.log(`\n📡 Available endpoints:`);
  console.log(`   POST /escrow/create`);
  console.log(`   POST /escrow/bind-address`);
  console.log(`   POST /escrow/resolve`);
  console.log(`   GET  /escrow/status/:code`);
  console.log(`   GET  /health`);
  console.log(`\n🔐 Authentication: Bearer token required for POST endpoints`);
  console.log(`\n`);
});

// Start event watcher (Phase 5)
async function startWatcher() {
  console.log("🔭 Starting event watcher...\n");
  
  try {
    await startWSS();
    await startBackfill();
    console.log("\n✅ Event watcher started successfully\n");
  } catch (error) {
    console.error("❌ Failed to start watcher:", error);
    process.exit(1);
  }
}

startWatcher();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n🛑 SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n🛑 SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

