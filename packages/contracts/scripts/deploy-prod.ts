import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts to Arbitrum One with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Real USDC on Arbitrum One
  const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // Oracle address (should be a Safe multi-sig or secure EOA)
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;
  
  console.log("\n=== Production Deployment Configuration ===");
  console.log("Network: Arbitrum One (42161)");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Oracle Address:", oracleAddress);
  console.log("\nProceed? (ctrl+c to cancel, or continue in 5 seconds...)");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Deploy EscrowFactory
  console.log("\nDeploying EscrowFactory...");
  const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
  const factory = await EscrowFactory.deploy(oracleAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("EscrowFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Arbitrum One (42161)");
  console.log("USDC:", USDC_ADDRESS);
  console.log("EscrowFactory:", factoryAddress);
  console.log("Oracle:", oracleAddress);
  console.log("\n=== Next Steps ===");
  console.log("1. Verify contract:");
  console.log(`   npx hardhat verify --network arbitrumOne ${factoryAddress} ${oracleAddress}`);
  console.log("\n2. Update .env.prod with:");
  console.log(`   FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`   USDC_ADDRESS=${USDC_ADDRESS}`);
  console.log("\n3. Fund oracle wallet with ETH for gas");
  console.log("\n4. Run canary escrows before full launch");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

