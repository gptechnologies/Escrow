/**
 * Database migration script
 * Run with: pnpm migrate
 */

import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sql } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log("Running database migration...");
  
  try {
    const schemaPath = resolve(__dirname, "schema.sql");
    const schema = await readFile(schemaPath, "utf-8");
    
    // Execute schema
    await sql.unsafe(schema);
    
    console.log("✅ Migration complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();

