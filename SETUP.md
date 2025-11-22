# Setup Guide

Step-by-step instructions to get the escrow oracle running on Arbitrum Sepolia.

## Phase 0-5 Implementation Checklist

### ✅ Phase 0: Repo Structure (COMPLETE)

- [x] Mono-repo created with `packages/contracts`, `packages/oracle`, `packages/bot`, `packages/ui`
- [x] Environment templates created: `env.local.template`, `env.test.template`, `env.prod.template`
- [x] Root `package.json` with workspace scripts
- [x] `.gitignore` configured

### ✅ Phase 1: Network Config (COMPLETE)

- [x] `packages/oracle/src/config/networks.ts` with Arbitrum Sepolia + Arbitrum One configs
- [x] `packages/oracle/src/config/env.ts` with environment variable loading
- [x] Placeholders for RPC URLs, contract addresses

**Action Required:**
1. Create Alchemy account at https://dashboard.alchemy.com/
2. Create two apps:
   - "Escrow Oracle - Arbitrum Sepolia"
   - "Escrow Oracle - Arbitrum One"
3. Copy HTTP and WSS URLs from each app
4. Create/fund oracle wallet:
   - Generate new wallet or use existing
   - Get Sepolia ETH from https://bridge.arbitrum.io/
   - Save private key securely

### ✅ Phase 2: Deployment Scripts (COMPLETE)

- [x] Hardhat configuration in `packages/contracts/hardhat.config.ts`
- [x] Sepolia deployment script: `packages/contracts/scripts/deploy-sepolia.ts`
- [x] Production deployment script: `packages/contracts/scripts/deploy-prod.ts`

**Action Required:**
1. Fill in `.env.test`:
   ```bash
   cp env.test.template .env.test
   # Edit .env.test with your Alchemy keys and oracle private key
   ```

2. Deploy to Arbitrum Sepolia:
   ```bash
   cd packages/contracts
   pnpm install
   NODE_ENV=test pnpm deploy:sepolia
   ```

3. Copy deployed addresses into `.env.test`:
   ```
   FACTORY_ADDRESS=0x...
   USDC_ADDRESS=0x...
   ```

4. Verify contracts on Arbiscan (use commands from deployment output)

### ✅ Phase 3: Database Schema (COMPLETE)

- [x] SQL schema in `packages/oracle/src/db/schema.sql`
- [x] Database client in `packages/oracle/src/db/client.ts`
- [x] Migration script in `packages/oracle/src/db/migrate.ts`

**Action Required:**
1. Provision Postgres database:
   - **Neon** (recommended): https://neon.tech/
     - Sign up → Create project → Copy connection string
   - **Supabase**: https://supabase.com/
     - Create project → Settings → Database → Connection string
   - **Railway**: https://railway.app/
     - New project → Add Postgres → Copy connection string

2. Provision Redis:
   - **Upstash** (recommended): https://upstash.com/
     - Create database → Copy REST URL
   - **Redis Cloud**: https://redis.com/cloud/
     - Create database → Copy connection string

3. Add to `.env.test`:
   ```
   POSTGRES_URL=postgresql://user:password@host.com:5432/db?sslmode=require
   REDIS_URL=rediss://default:password@host.upstash.io:6379
   ```

4. Run migrations:
   ```bash
   cd packages/oracle
   pnpm install
   NODE_ENV=test pnpm migrate
   ```

### ✅ Phase 4: Oracle API (COMPLETE)

- [x] Express server in `packages/oracle/src/index.ts`
- [x] API routes in `packages/oracle/src/api/routes.ts`
- [x] Request validation with Zod
- [x] Auth middleware for protected endpoints
- [x] Escrow service functions in `packages/oracle/src/services/escrow.ts`
- [x] Nonce manager with retry logic

**Action Required:**
1. Generate webhook secret:
   ```bash
   openssl rand -hex 32
   ```

2. Add to `.env.test`:
   ```
   WEBHOOK_SHARED_SECRET=your_generated_secret_here
   PORT=3000
   ```

### ✅ Phase 5: Event Watcher (COMPLETE)

- [x] BullMQ queue setup in `packages/oracle/src/watcher/queue.ts`
- [x] WebSocket + HTTP backfill watcher in `packages/oracle/src/watcher/events.ts`
- [x] Event handlers for EscrowCreated, Transfer, and Escrow events
- [x] Cursor tracking for reorg-safe backfill

## Running the Oracle

### Start in Development Mode

```bash
cd packages/oracle
NODE_ENV=test pnpm dev
```

You should see:
```
✅ Database connected
✅ Redis connected
✅ Blockchain clients initialized for Arbitrum Sepolia
   Oracle address: 0x...
🚀 Oracle API listening on port 3000
🔭 Starting event watcher...
📊 Loaded X active escrows
🔌 Starting WebSocket subscriptions...
✅ WSS subscriptions active
🔄 Starting backfill loop...
```

### Test with Postman

1. Create a new request in Postman
2. Set method to `POST`
3. URL: `http://localhost:3000/escrow/create`
4. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET`
5. Body (raw JSON):
   ```json
   {
     "targetAmount": "10000000",
     "confirmationAmount": "1000000",
     "expectedFunderAddress": "0xYourAddress"
   }
   ```
6. Send request

Response will include:
```json
{
  "escrow": "0x...",
  "code": "abc123xyz",
  "txHash": "0x...",
  "phase": 0
}
```

7. View on Arbiscan: `https://sepolia.arbiscan.io/tx/TX_HASH`

### Check Status

```
GET http://localhost:3000/escrow/status/abc123xyz
```

Returns current phase and addresses.

## Next Steps

After Phase 5 is working:

1. **Phase 6**: Add DM bot for Twitter/Discord integration
2. **Phase 7**: Connect Airtable form intake
3. **Phase 8**: Run end-to-end tests on Sepolia
4. **Phase 9**: Security hardening (KMS, alerts, monitoring)
5. **Phase 10**: Production cutover to Arbitrum One

## Troubleshooting

### "ORACLE_PRIVATE_KEY is required"

Ensure `.env.test` exists in workspace root and contains valid private key starting with `0x`.

### "Database connection failed"

Check `POSTGRES_URL` format. Should include `?sslmode=require` for cloud databases.

### "Redis connection failed"

Check `REDIS_URL`. Upstash URLs start with `rediss://` (note the double 's').

### "Transaction would revert"

Check:
- Oracle wallet has ETH for gas
- Contract addresses are correct
- Wallet has USDC (for funding/confirmation)

### "WebSocket error"

Check WSS URL from Alchemy. Should start with `wss://`.

## Support

For issues or questions, contact the project maintainer.

