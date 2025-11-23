import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy mock x402 credit (for testing)
  // In production, use actual x402 credit address
  const MockX402Credit = await ethers.getContractFactory("MockX402Credit");
  const mockX402Credit = await MockX402Credit.deploy();
  await mockX402Credit.waitForDeployment();
  const x402CreditAddress = await mockX402Credit.getAddress();
  console.log("MockX402Credit deployed to:", x402CreditAddress);

  // Deploy AquaIntegration
  const AquaIntegration = await ethers.getContractFactory("AquaIntegration");
  // Use USDC address for liquidity token (placeholder)
  const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Mainnet USDC
  const aquaPoolAddress = ethers.ZeroAddress; // Placeholder
  const aqua = await AquaIntegration.deploy(usdcAddress, aquaPoolAddress);
  await aqua.waitForDeployment();
  const aquaAddress = await aqua.getAddress();
  console.log("AquaIntegration deployed to:", aquaAddress);

  // Deploy RFQ
  const RFQ = await ethers.getContractFactory("RFQ");
  const rfq = await RFQ.deploy(x402CreditAddress);
  await rfq.waitForDeployment();
  const rfqAddress = await rfq.getAddress();
  console.log("RFQ deployed to:", rfqAddress);

  // Deploy Auction
  const Auction = await ethers.getContractFactory("Auction");
  const auction = await Auction.deploy(x402CreditAddress);
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("Auction deployed to:", auctionAddress);

  // Deploy AgentFinance
  const AgentFinance = await ethers.getContractFactory("AgentFinance");
  const agentFinance = await AgentFinance.deploy(
    rfqAddress,
    auctionAddress,
    aquaAddress,
    x402CreditAddress
  );
  await agentFinance.waitForDeployment();
  const agentFinanceAddress = await agentFinance.getAddress();
  console.log("AgentFinance deployed to:", agentFinanceAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("x402Credit:", x402CreditAddress);
  console.log("AquaIntegration:", aquaAddress);
  console.log("RFQ:", rfqAddress);
  console.log("Auction:", auctionAddress);
  console.log("AgentFinance:", agentFinanceAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

