# Next Steps - Phase 5: Deploy & Test (Arbitrum Sepolia)

## 🎯 Goal: Live Simulation
Get the system running on Arbitrum Sepolia and simulate the full escrow lifecycle using manual wallet transactions.

## 1. Infrastructure Setup (Do this first)
Before running any code, you need to provision these 4 services:

| Service | Provider | Action | Value Needed |
|---------|----------|--------|--------------|
| **RPC** | Alchemy | Create App (Arbitrum Sepolia) | HTTP & WSS URLs |
| **Database** | Neon | Create Project (Postgres) | Connection String |
| **Redis** | Upstash | Create Database | Connection String |
| **Wallet** | MetaMask | Export Private Key (Sepolia) | Private Key |

## 2. Configuration
1. Create `.env.test` in the **workspace root**:
   ```bash
   cp env.test.template .env.test
   ```
2. Fill in the values from Step 1.
3. Generate a random secret for `WEBHOOK_SHARED_SECRET`.

## 3. Deploy Contracts (Hardhat)
We need to ship the `EscrowFactory` and `MockUSDC` to the testnet.

```bash
cd packages/contracts
pnpm install
NODE_ENV=test pnpm deploy:sepolia
```

**Output:**
```text
MockUSDC deployed to: 0x123...
EscrowFactory deployed to: 0x456...
```

**Action:** Copy these two addresses into your `.env.test` file:
```bash
FACTORY_ADDRESS=0x456...
USDC_ADDRESS=0x123...
```

## 4. Launch Oracle
Start the service that watches the blockchain.

```bash
cd packages/oracle
pnpm install
NODE_ENV=test pnpm migrate   # Creates DB tables
NODE_ENV=test pnpm dev       # Starts the API + Watcher
```

## 5. Simulation (The Fun Part)
Now you will act as the users (Creator, Confirmer, Funder) using Postman and MetaMask.

### Step A: Create Escrow (Postman)
Send a POST request to create the contract.

**Endpoint:** `POST http://localhost:3000/escrow/create`
**Headers:**
- `Authorization: Bearer YOUR_SECRET`
- `Content-Type: application/json`
**Body:**
```json
{
  "targetAmount": "10000000",        // 10.00 USDC (6 decimals)
  "confirmationAmount": "1000000",   // 1.00 USDC
  "expectedFunderAddress": "0xYourWalletAddress"
}
```

**Response:**
Save the `code` (e.g., `abc123xyz`) and `escrow` address (e.g., `0x789...`).

### Step B: Monitor Status (CLI)
Open a new terminal and watch the magic happen:
```bash
cd packages/oracle
pnpm check-status abc123xyz --watch
```
*Status: 🟡 AwaitingConfirmation*

### Step C: Simulate Confirmation (MetaMask)
1. Open MetaMask (connected to Arbitrum Sepolia).
2. Send **1.0 MockUSDC** to the **Escrow Address** (`0x789...`).
   *(Note: You may need to mint MockUSDC first using Etherscan or a script, or just send ETH if testing native token logic, but this system expects USDC)*.
3. Wait ~10 seconds.
4. **Check CLI:** Should update to *🔵 ConfirmedAwaitingFunding*.

### Step D: Simulate Funding (MetaMask)
1. Send **10.0 MockUSDC** to the **Escrow Address**.
2. Wait ~10 seconds.
3. **Check CLI:** Should update to *🟢 Funded*.

### Step E: Resolve (Postman)
The job is done. Now release the funds.

**Endpoint:** `POST http://localhost:3000/escrow/resolve`
**Body:**
```json
{
  "code": "abc123xyz",
  "action": "PAY"
}
```
**Check CLI:** Should update to *🏁 Resolved*.

---

## ⏭️ What's Next?
Once this flow works, you have a working MVP!
- **Phase 6**: Connect the Twitter Bot (so DMing "confirm" replaces Step C).
- **Phase 7**: Connect Airtable (so a form submission replaces Step A).
