# 📝 Placeholders You Need to Fill

This checklist shows every placeholder in the codebase that requires your input to make the system functional.

## 🔐 Create `.env.test` File

Copy `env.test.template` to `.env.test` in workspace root and fill these values:

### 1. RPC Endpoints (from Alchemy)

Create account at: https://dashboard.alchemy.com/

Create "Arbitrum Sepolia" app, then copy:

```bash
RPC_HTTP=https://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
RPC_WSS=wss://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
```

### 2. Oracle Wallet

Generate or use existing wallet:

```bash
ORACLE_PRIVATE_KEY=0xYOUR_64_CHARACTER_PRIVATE_KEY_HERE
```

**Requirements:**
- Must start with `0x`
- 64 hex characters after `0x`
- Needs Sepolia ETH for gas (get from https://bridge.arbitrum.io/)

### 3. Database (Postgres)

Sign up at: https://neon.tech/ (or Supabase/Railway)

Create database, copy connection string:

```bash
POSTGRES_URL=postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**Requirements:**
- Must include `?sslmode=require` for cloud databases
- Test connection before proceeding

### 4. Redis

Sign up at: https://upstash.com/ (or Redis Cloud)

Create Redis database, copy connection string:

```bash
REDIS_URL=rediss://default:AbCdEf123456@us1-xxxx.upstash.io:6379
```

**Requirements:**
- Upstash URLs start with `rediss://` (note double 's')
- Must include password

### 5. Contract Addresses

Deploy contracts first, then fill these:

```bash
FACTORY_ADDRESS=0x_DEPLOYED_FACTORY_ADDRESS_SEPOLIA
USDC_ADDRESS=0x_DEPLOYED_MOCK_USDC_ADDRESS_SEPOLIA
```

**How to get:**
```bash
cd packages/contracts
pnpm install
NODE_ENV=test pnpm deploy:sepolia
# Copy addresses from output
```

### 6. Webhook Secret

Generate strong random secret:

```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use online generator:
# https://www.random.org/strings/
```

```bash
WEBHOOK_SHARED_SECRET=YOUR_64_CHARACTER_HEX_STRING_HERE
```

### 7. Etherscan API Key (Optional)

For contract verification on Arbiscan:

Sign up at: https://arbiscan.io/register

Get API key from: https://arbiscan.io/myapikey

```bash
ETHERSCAN_API_KEY=YOUR_ARBISCAN_API_KEY
```

### 8. Other Fields (Leave as-is for now)

These are for Phase 6+ (DM bot, Airtable):

```bash
# DM Platform (Phase 6)
DM_PLATFORM=twitter
TWITTER_BEARER=YOUR_TWITTER_BEARER_TOKEN
TWITTER_APP_KEY=YOUR_TWITTER_APP_KEY
TWITTER_APP_SECRET=YOUR_TWITTER_APP_SECRET
TWITTER_WEBHOOK_SECRET=YOUR_TWITTER_WEBHOOK_SECRET

# Airtable (Phase 7)
AIRTABLE_API_KEY=YOUR_AIRTABLE_API_KEY
AIRTABLE_BASE_ID=YOUR_AIRTABLE_BASE_ID
AIRTABLE_TABLE=Escrows
```

## ✅ Complete `.env.test` Template

```bash
# Test environment - Arbitrum Sepolia
NODE_ENV=test
CHAIN_ID=421614

# [1] Alchemy RPC endpoints for Arbitrum Sepolia
RPC_HTTP=https://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
RPC_WSS=wss://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# [2] Oracle wallet (funded test EOA on Arbitrum Sepolia)
ORACLE_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# [5] Contract addresses (deploy to Sepolia first)
FACTORY_ADDRESS=0x_DEPLOYED_FACTORY_ADDRESS_SEPOLIA
USDC_ADDRESS=0x_DEPLOYED_MOCK_USDC_ADDRESS_SEPOLIA

# [3] Database (Neon/Supabase/Railway)
POSTGRES_URL=postgresql://user:password@host.neon.tech:5432/db?sslmode=require

# [4] Redis (Upstash or Redis Cloud)
REDIS_URL=rediss://default:password@host.upstash.io:6379

# API
PORT=3000

# [6] Webhook secret
WEBHOOK_SHARED_SECRET=YOUR_64_CHARACTER_SECRET_HERE

# [8] DM Platform (optional for Phase 5)
DM_PLATFORM=twitter
TWITTER_BEARER=YOUR_TWITTER_BEARER_TOKEN
TWITTER_APP_KEY=YOUR_TWITTER_APP_KEY
TWITTER_APP_SECRET=YOUR_TWITTER_APP_SECRET
TWITTER_WEBHOOK_SECRET=YOUR_TWITTER_WEBHOOK_SECRET

# [8] Airtable (optional for Phase 5)
AIRTABLE_API_KEY=YOUR_AIRTABLE_API_KEY
AIRTABLE_BASE_ID=YOUR_AIRTABLE_BASE_ID
AIRTABLE_TABLE=Escrows

# [7] Deployment (optional, for contract verification)
ETHERSCAN_API_KEY=YOUR_ARBISCAN_API_KEY
```

## 📋 Verification Checklist

Before starting the service, verify:

- [ ] `.env.test` file exists in workspace root (not in packages/oracle)
- [ ] All `YOUR_*` placeholders replaced with real values
- [ ] Oracle wallet has Sepolia ETH (check on https://sepolia.arbiscan.io/)
- [ ] Postgres connection string ends with `?sslmode=require`
- [ ] Redis URL starts with `rediss://` (double 's')
- [ ] Contract addresses start with `0x` and are 42 characters
- [ ] Webhook secret is at least 32 characters
- [ ] No trailing spaces or quotes in values

## 🧪 Test Your Configuration

### 1. Test Database Connection

```bash
cd packages/oracle
pnpm install
NODE_ENV=test pnpm migrate
```

Should output: `✅ Migration complete`

### 2. Test Service Startup

```bash
cd packages/oracle
NODE_ENV=test pnpm dev
```

Should output:
```
✅ Database connected
✅ Redis connected
✅ Blockchain clients initialized for Arbitrum Sepolia
🚀 Oracle API listening on port 3000
```

### 3. Test API Endpoint

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

## 🐛 Common Issues

### "ORACLE_PRIVATE_KEY is required"
- Ensure `.env.test` is in workspace root (not packages/oracle)
- Check private key starts with `0x`

### "Database connection failed"
- Verify `POSTGRES_URL` format
- Ensure `?sslmode=require` is included
- Test connection using a Postgres client

### "Redis connection failed"
- Check URL starts with `rediss://` (double 's')
- Verify password is correct
- Ensure no spaces in URL

### "Transaction would revert"
- Oracle wallet needs Sepolia ETH
- Verify contract addresses are correct
- Check network is Arbitrum Sepolia (421614)

## 🎯 Ready to Launch

Once all placeholders are filled and tests pass, proceed to:

1. Deploy contracts: See `packages/contracts/README.md`
2. Start service: See `packages/oracle/README.md`
3. Test endpoints: See `QUICK_REFERENCE.md`

## 📞 Where to Get Help

- **Alchemy**: https://docs.alchemy.com/
- **Neon DB**: https://neon.tech/docs
- **Upstash**: https://docs.upstash.com/
- **Arbitrum**: https://docs.arbitrum.io/
- **Hardhat**: https://hardhat.org/docs

## 🎊 You Got This!

Fill in these placeholders, run the tests, and you'll have a working oracle service in ~30 minutes!

