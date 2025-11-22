import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts to Arbitrum Sepolia with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MockUSDC (6 decimals like real USDC)
  console.log("\n1. Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // Mint test USDC to deployer (100,000 USDC with 6 decimals)
  console.log("\n2. Minting test USDC...");
  const mintAmount = ethers.parseUnits("100000", 6);
  const mintTx = await usdc.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("Minted 100,000 USDC to:", deployer.address);

  // Deploy EscrowFactory with deployer as oracle
  console.log("\n3. Deploying EscrowFactory...");
  const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
  const factory = await EscrowFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("EscrowFactory deployed to:", factoryAddress);
  console.log("Oracle set to:", deployer.address);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Arbitrum Sepolia (421614)");
  console.log("MockUSDC:", usdcAddress);
  console.log("EscrowFactory:", factoryAddress);
  console.log("Oracle:", deployer.address);
  console.log("\n=== Next Steps ===");
  console.log("1. Verify contracts:");
  console.log(`   npx hardhat verify --network arbitrumSepolia ${usdcAddress} "Mock USDC" "USDC" 6`);
  console.log(`   npx hardhat verify --network arbitrumSepolia ${factoryAddress} ${deployer.address}`);
  console.log("\n2. Update .env.test with:");
  console.log(`   FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`   USDC_ADDRESS=${usdcAddress}`);
  console.log("\n3. Mint USDC to test accounts via Arbiscan or script");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

