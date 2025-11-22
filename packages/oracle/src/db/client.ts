import postgres from "postgres";
import { ENV } from "../config/env.js";

if (!ENV.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is required");
}

export const sql = postgres(ENV.POSTGRES_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Helper to convert hex string to Buffer for BYTEA columns
export function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}

// Helper to convert Buffer to hex string
export function bufferToHex(buffer: Buffer): string {
  return "0x" + buffer.toString("hex");
}

// Test connection
sql`SELECT 1`
  .then(() => console.log("✅ Database connected"))
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  });

