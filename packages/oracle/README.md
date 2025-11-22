# Escrow Oracle Service

Node.js/TypeScript service that manages escrow contracts via HTTP API and watches blockchain events.

## Features

- ✅ **Phase 0-5 Complete**
- HTTP API for creating, binding, and resolving escrows
- Event watcher with WSS subscriptions + HTTP backfill
- BullMQ job queues for per-escrow serialization
- Nonce management with retry and exponential backoff
- Postgres database for escrow registry and cursor tracking
- Redis for job queues

## Setup

### 1. Install dependencies

```bash
cd packages/oracle
pnpm install
```

### 2. Configure environment

Copy the appropriate env template to the workspace root:

```bash
# For Arbitrum Sepolia testing
cp ../../env.test.template ../../.env.test
```

Fill in the required values:
- `RPC_HTTP` and `RPC_WSS` from Alchemy
- `ORACLE_PRIVATE_KEY` (your funded wallet)
- `FACTORY_ADDRESS` and `USDC_ADDRESS` (from contract deployment)
- `POSTGRES_URL` (from Neon/Supabase/Railway)
- `REDIS_URL` (from Upstash/Redis Cloud)
- `WEBHOOK_SHARED_SECRET` (generate a strong random string)

### 3. Run database migration

```bash
NODE_ENV=test pnpm migrate
```

This creates the required tables: `cursor`, `escrows`, `processed_tx`, `dm_flags`.

### 4. Start the service

Development mode (with hot reload):

```bash
NODE_ENV=test pnpm dev
```

Production mode:

```bash
pnpm build
NODE_ENV=production pnpm start
```

## API Endpoints

All POST endpoints require `Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET` header.

### POST /escrow/create

Create a new escrow contract.

**Request:**
```json
{
  "targetAmount": "10000000",
  "confirmationAmount": "1000000",
  "deadline": 1735689600,
  "tweetId": 0,
  "expectedFunderAddress": "0x..."
}
```

**Response:**
```json
{
  "escrow": "0x...",
  "code": "abc123xyz",
  "txHash": "0x...",
  "phase": 0
}
```

### POST /escrow/bind-address

Bind a wallet address to an escrow role.

**Request:**
```json
{
  "code": "abc123xyz",
  "role": "CONFIRMER",
  "address": "0x...",
  "confirmBy": 1735689600
}
```

**Response:**
```json
{
  "escrow": "0x...",
  "code": "abc123xyz",
  "txHash": "0x...",
  "role": "CONFIRMER",
  "address": "0x..."
}
```

### POST /escrow/resolve

Resolve an escrow (pay or refund).

**Request:**
```json
{
  "code": "abc123xyz",
  "action": "PAY",
  "pollId": 12345
}
```

**Response:**
```json
{
  "escrow": "0x...",
  "code": "abc123xyz",
  "txHash": "0x...",
  "action": "PAY"
}
```

### GET /escrow/status/:code

Get current status of an escrow.

**Response:**
```json
{
  "escrow": "0x...",
  "code": "abc123xyz",
  "phase": 1,
  "phaseName": "ConfirmedAwaitingFunding",
  "expectedFunder": "0x...",
  "expectedConfirmer": "0x...",
  "funder": null,
  "confirmer": "0x..."
}
```

### GET /health

Health check endpoint.

## Testing with Postman/curl

1. Start the service with `pnpm dev`
2. Set your auth header: `Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET`
3. Create an escrow:

```bash
curl -X POST http://localhost:3000/escrow/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{
    "targetAmount": "10000000",
    "confirmationAmount": "1000000",
    "expectedFunderAddress": "0xYourAddress"
  }'
```

4. Check status:

```bash
curl http://localhost:3000/escrow/status/abc123xyz
```

5. View transaction on Arbiscan:
   - Sepolia: https://sepolia.arbiscan.io/tx/TRANSACTION_HASH
   - Mainnet: https://arbiscan.io/tx/TRANSACTION_HASH

## Architecture

### Event Watcher

The watcher monitors:
- `EscrowFactory.EscrowCreated` events (adds to active set)
- `USDC.Transfer` events to active escrows
- Escrow contract events (confirmation, funding, resolution)

It uses dual strategy:
1. **WSS subscriptions** for real-time events
2. **HTTP backfill** every 10-15s to catch missed events

### Job Queues

Each escrow gets its own BullMQ queue to serialize oracle actions. Jobs are retried with exponential backoff.

### Database Schema

- `cursor`: Tracks last processed block per network
- `escrows`: Registry of all escrows with cached phase
- `processed_tx`: Deduplication of processed events
- `dm_flags`: DM confirmation flags (Phase 6)

## Deployment

### Option 1: Render

1. Create new Web Service
2. Set environment to Node
3. Build: `cd packages/oracle && pnpm install && pnpm build`
4. Start: `cd packages/oracle && NODE_ENV=production pnpm start`
5. Add environment variables from `.env.test` or `.env.prod`

### Option 2: Railway

1. Create new project from GitHub
2. Set root directory to `packages/oracle`
3. Add environment variables
4. Railway auto-detects Node.js and runs the service

### Option 3: Fly.io

1. Install `flyctl`
2. Run `fly launch` in `packages/oracle`
3. Set secrets: `fly secrets set KEY=VALUE`
4. Deploy: `fly deploy`

## Next Steps (Phase 6+)

- [ ] Add DM bot webhook integration
- [ ] Connect Airtable intake automation
- [ ] Implement auto-recording of Transfer events
- [ ] Add Sentry error tracking
- [ ] Set up uptime monitoring

