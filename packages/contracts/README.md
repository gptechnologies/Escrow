# Escrow Contracts

Smart contracts for the escrow system.

## Setup

```bash
cd packages/contracts
pnpm install
```

## Compile

```bash
pnpm compile
```

## Deploy

### Arbitrum Sepolia (Test)

1. Copy `.env.test.template` to `.env.test` and fill in your Alchemy API key and oracle private key
2. Fund your oracle wallet with Sepolia ETH (use bridge: https://bridge.arbitrum.io/)
3. Deploy:

```bash
pnpm deploy:sepolia
```

4. Verify contracts (use addresses from deployment output):

```bash
npx hardhat verify --network arbitrumSepolia <USDC_ADDRESS> "Mock USDC" "USDC" 6
npx hardhat verify --network arbitrumSepolia <FACTORY_ADDRESS> <ORACLE_ADDRESS>
```

### Arbitrum One (Production)

1. Copy `.env.prod.template` to `.env.prod` and fill in production credentials
2. Fund your production oracle wallet with ETH
3. Deploy:

```bash
pnpm deploy:prod
```

4. Verify:

```bash
npx hardhat verify --network arbitrumOne <FACTORY_ADDRESS> <ORACLE_ADDRESS>
```

## Contract Addresses

### Arbitrum Sepolia
- MockUSDC: (deploy first)
- EscrowFactory: (deploy first)

### Arbitrum One
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- EscrowFactory: (deploy when ready)

