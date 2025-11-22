# Quick Reference Card

## 🚀 Start Development

```bash
cd "/Users/jm/Desktop/Escrow Smart Contract/packages/oracle"
NODE_ENV=test pnpm dev
```

## 📝 Environment Files

Located in workspace root:
- `.env.test` (Arbitrum Sepolia) - **You need to create this**
- `.env.prod` (Arbitrum One) - For production later

Templates available:
- `env.test.template`
- `env.prod.template`

## 🔑 Required Keys

| Variable | Where to Get |
|----------|--------------|
| `RPC_HTTP` | https://dashboard.alchemy.com/ |
| `RPC_WSS` | https://dashboard.alchemy.com/ |
| `ORACLE_PRIVATE_KEY` | MetaMask or generate new |
| `POSTGRES_URL` | https://neon.tech/ |
| `REDIS_URL` | https://upstash.com/ |
| `WEBHOOK_SHARED_SECRET` | `openssl rand -hex 32` |
| `FACTORY_ADDRESS` | Deploy contracts first |
| `USDC_ADDRESS` | Deploy contracts first |

## 🛠️ Common Commands

### Deploy Contracts
```bash
cd packages/contracts
pnpm install
NODE_ENV=test pnpm deploy:sepolia
```

### Run Migration
```bash
cd packages/oracle
pnpm install
NODE_ENV=test pnpm migrate
```

### Start Oracle
```bash
cd packages/oracle
NODE_ENV=test pnpm dev
```

## 📡 API Endpoints

Base URL: `http://localhost:3000`

Auth: `Authorization: Bearer YOUR_WEBHOOK_SHARED_SECRET`

### Create Escrow
```bash
POST /escrow/create
{
  "targetAmount": "10000000",
  "confirmationAmount": "1000000",
  "expectedFunderAddress": "0x..."
}
```

### Bind Address
```bash
POST /escrow/bind-address
{
  "code": "abc123",
  "role": "CONFIRMER",
  "address": "0x...",
  "confirmBy": 1735689600
}
```

### Resolve
```bash
POST /escrow/resolve
{
  "code": "abc123",
  "action": "PAY",
  "pollId": 0
}
```

### Get Status
```bash
GET /escrow/status/:code
```

### Check Status CLI (Real-time)
```bash
# Run in packages/oracle directory
# Replace CODE with your escrow code (e.g., abc123xyz)

# One-time check
pnpm check-status CODE

# Watch mode (updates every 3s)
pnpm check-status CODE --watch
```

### Health Check
```bash
GET /health
```

## 🔍 Check Transaction on Arbiscan

Sepolia: `https://sepolia.arbiscan.io/tx/{TX_HASH}`

Mainnet: `https://arbiscan.io/tx/{TX_HASH}`

## 📦 Project Structure

```
escrow-oracle/
├── packages/
│   ├── contracts/          ← Deploy first
│   │   ├── Escrow.sol
│   │   ├── EscrowFactory.sol
│   │   ├── MockUSDC.sol
│   │   └── scripts/
│   ├── oracle/             ← Main service
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── blockchain/
│   │   │   ├── config/
│   │   │   ├── contracts/
│   │   │   ├── db/
│   │   │   ├── services/
│   │   │   ├── watcher/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── bot/                ← Phase 6
│   └── ui/                 ← Phase 11
├── .env.test               ← CREATE THIS
├── .env.prod               ← For production
└── README.md
```

## 🐛 Debug Checklist

- [ ] `.env.test` exists in workspace root
- [ ] All keys filled in `.env.test`
- [ ] Oracle wallet has Sepolia ETH
- [ ] Contracts deployed (FACTORY_ADDRESS set)
- [ ] Database migration ran successfully
- [ ] Redis connection working
- [ ] Port 3000 not in use

## 📞 Support Resources

- **Alchemy**: https://dashboard.alchemy.com/
- **Neon DB**: https://neon.tech/
- **Upstash Redis**: https://upstash.com/
- **Arbiscan Sepolia**: https://sepolia.arbiscan.io/
- **Arbitrum Bridge**: https://bridge.arbitrum.io/

## 💡 Tips

1. **Test locally first**: Use Sepolia before mainnet
2. **Keep secrets safe**: Never commit `.env` files
3. **Monitor gas**: Oracle pays for all transactions
4. **Check Arbiscan**: Always verify transactions on-chain
5. **Use Postman**: Easier than curl for API testing

## 🎯 Success Criteria

Phase 5 is working when you can:
- ✅ Start oracle service without errors
- ✅ Create escrow via API
- ✅ See transaction on Arbiscan
- ✅ Get escrow status via API
- ✅ Service recovers from restart (cursor tracking works)

## 🔄 Development Workflow

1. Make code changes
2. Service auto-reloads (using `tsx watch`)
3. Test with Postman
4. Check logs in terminal
5. Verify on Arbiscan

## 📚 Full Documentation

- `README.md` - Project overview
- `SETUP.md` - Detailed setup guide
- `NEXT_STEPS.md` - What to do next
- `packages/oracle/README.md` - API docs
- `packages/contracts/README.md` - Contract docs

