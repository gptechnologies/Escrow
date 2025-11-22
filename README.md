# Escrow Oracle Monorepo

End-to-end escrow system with smart contracts, oracle service, and integrations for Arbitrum.

## 🏗️ Project Status

**Phases 0-5 Complete**: Ready for testing on Arbitrum Sepolia!

- ✅ Phase 0: Mono-repo structure with env templates
- ✅ Phase 1: Network config and RPC placeholders
- ✅ Phase 2: Deployment scripts for Sepolia
- ✅ Phase 3: DB schema and infra placeholders
- ✅ Phase 4: Oracle HTTP API with endpoints
- ✅ Phase 5: Event watcher and queue system

## 📁 Structure

```
escrow-oracle/
├── packages/
│   ├── contracts/       # Solidity contracts (Escrow, EscrowFactory, MockUSDC)
│   ├── oracle/          # Node.js oracle service (API + watcher)
│   ├── bot/             # DM bot integration (Phase 6)
│   └── ui/              # Status UI (Phase 11)
├── env.local.template   # Local development env
├── env.test.template    # Arbitrum Sepolia env
└── env.prod.template    # Arbitrum One env
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Postgres database (Neon/Supabase/Railway)
- Redis instance (Upstash/Redis Cloud)
- Alchemy account with Arbitrum Sepolia + Arbitrum One apps

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup environment

Copy and fill in the test environment template:

```bash
cp env.test.template .env.test
```

Required values:
- `RPC_HTTP` and `RPC_WSS` - Get from Alchemy dashboard
- `ORACLE_PRIVATE_KEY` - Your funded wallet on Arbitrum Sepolia
- `POSTGRES_URL` - Database connection string
- `REDIS_URL` - Redis connection string
- `WEBHOOK_SHARED_SECRET` - Generate a strong random string (32+ chars)

### 3. Deploy contracts

```bash
cd packages/contracts
pnpm install
NODE_ENV=test pnpm deploy:sepolia
```

Copy the deployed addresses into `.env.test`:
- `FACTORY_ADDRESS`
- `USDC_ADDRESS`

### 4. Run database migrations

```bash
cd packages/oracle
NODE_ENV=test pnpm migrate
```

### 5. Start the oracle service

```bash
cd packages/oracle
NODE_ENV=test pnpm dev
```

The service will:
- Start HTTP API on port 3000
- Connect to blockchain via WebSocket
- Begin watching for events
- Backfill missed blocks every 10s

## 🧪 Testing

### Using Postman/curl

1. **Create an escrow:**

```bash
curl -X POST http://localhost:3000/escrow/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET" \
  -d '{
    "targetAmount": "10000000",
    "confirmationAmount": "1000000",
    "expectedFunderAddress": "0xYourAddress"
  }'
```

Response includes `escrow` address, `code`, and `txHash`.

2. **Check status:**

```bash
curl http://localhost:3000/escrow/status/YOUR_CODE
```

3. **View on Arbiscan:**

Visit `https://sepolia.arbiscan.io/tx/YOUR_TX_HASH` to see the on-chain transaction history.

4. **Bind confirmer address:**

```bash
curl -X POST http://localhost:3000/escrow/bind-address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET" \
  -d '{
    "code": "YOUR_CODE",
    "role": "CONFIRMER",
    "address": "0xConfirmerAddress"
  }'
```

5. **Resolve escrow:**

```bash
curl -X POST http://localhost:3000/escrow/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET" \
  -d '{
    "code": "YOUR_CODE",
    "action": "PAY",
    "pollId": 0
  }'
```

## 📚 Package Documentation

### Contracts

See [packages/contracts/README.md](packages/contracts/README.md)

- Solidity contracts with Hardhat
- Deployment scripts for Sepolia and Arbitrum One
- Verification via Arbiscan

### Oracle

See [packages/oracle/README.md](packages/oracle/README.md)

- Node.js/TypeScript service
- HTTP API with Express
- Event watcher with viem
- Job queues with BullMQ

## 🔐 Infrastructure Requirements

Before deploying to production:

1. **Database**: Provision Postgres
   - [Neon](https://neon.tech/) (recommended)
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)

2. **Redis**: Provision Redis instance
   - [Upstash](https://upstash.com/) (recommended)
   - [Redis Cloud](https://redis.com/cloud/)

3. **RPC Provider**: Create Alchemy apps
   - [Alchemy Dashboard](https://dashboard.alchemy.com/)
   - One app for Arbitrum Sepolia (testing)
   - One app for Arbitrum One (production)

4. **Hosting**: Deploy oracle service
   - [Render](https://render.com/)
   - [Railway](https://railway.app/)
   - [Fly.io](https://fly.io/)

5. **Wallet**: Fund oracle wallet
   - Sepolia ETH for testing (use [bridge](https://bridge.arbitrum.io/))
   - Real ETH for production
   - Consider using a Safe multi-sig for production

## 🗺️ Roadmap

### Completed (Phases 0-5)

- ✅ Mono-repo structure
- ✅ Contract deployment scripts
- ✅ Database schema
- ✅ Oracle HTTP API
- ✅ Event watcher with WSS + backfill
- ✅ Job queues for serialization

### Next Steps (Phase 6+)

- [ ] Phase 6: DM bot integration (Twitter webhook)
- [ ] Phase 7: Airtable intake automation
- [ ] Phase 8: E2E testing on Sepolia
- [ ] Phase 9: Security hardening (KMS, alerts, logging)
- [ ] Phase 10: Production cutover to Arbitrum One
- [ ] Phase 11: Status UI and admin console

## 📖 API Reference

### Endpoints

- `POST /escrow/create` - Create new escrow
- `POST /escrow/bind-address` - Bind wallet to role
- `POST /escrow/resolve` - Resolve escrow (PAY/REFUND)
- `GET /escrow/status/:code` - Get escrow status
- `GET /health` - Health check

All POST endpoints require `Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET`.

See [packages/oracle/README.md](packages/oracle/README.md) for detailed API docs.

## 🛠️ Development

### Run oracle in dev mode

```bash
cd packages/oracle
NODE_ENV=test pnpm dev
```

### Compile contracts

```bash
cd packages/contracts
pnpm compile
```

### Run migrations

```bash
cd packages/oracle
NODE_ENV=test pnpm migrate
```

## 📝 Environment Files

- `env.local.template` - Local development (Hardhat/Anvil)
- `env.test.template` - Arbitrum Sepolia (testnet)
- `env.prod.template` - Arbitrum One (mainnet)

Copy the appropriate template and fill in your values. **Never commit real `.env` files.**

## 🤝 Contributing

This is a private project. Contact the maintainer for access.

## 📄 License

MIT

