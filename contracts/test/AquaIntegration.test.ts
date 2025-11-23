import { expect } from "chai";
import hre from "hardhat";
import { AquaIntegration } from "../typechain-types/contracts_src/aqua/AquaIntegration";

describe("AquaIntegration", function () {
  let aqua: AquaIntegration;
  let mockToken: any;
  let owner: any;
  let lender: any;

  beforeEach(async function () {
    [owner, lender] = await hre.ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("USDC", "USDC", 6);
    await mockToken.waitForDeployment();

    // Deploy AquaIntegration
    const AquaIntegrationContract = await hre.ethers.getContractFactory("AquaIntegration");
    aqua = await AquaIntegrationContract.deploy(
      await mockToken.getAddress(),
      hre.ethers.ZeroAddress // Placeholder for Aqua pool
    );
    await aqua.waitForDeployment();
  });

  it("Should connect liquidity", async function () {
    const amount = hre.ethers.parseUnits("1000", 6);
    await mockToken.mint(lender.address, amount);
    await mockToken.connect(lender).approve(await aqua.getAddress(), amount);

    await aqua.connect(lender).connectLiquidity(amount);

    const liquidity = await aqua.liquidityProvided(lender.address);
    expect(liquidity).to.equal(amount);
  });

  it("Should reserve liquidity", async function () {
    const amount = hre.ethers.parseUnits("1000", 6);
    await mockToken.mint(lender.address, amount);
    await mockToken.connect(lender).approve(await aqua.getAddress(), amount);
    await aqua.connect(lender).connectLiquidity(amount);

    await aqua.reserveLiquidity(lender.address, amount / 2n);

    const reserved = await aqua.liquidityReserved(lender.address);
    expect(reserved).to.equal(amount / 2n);
  });
});

