/// <reference types="mocha" />
// @ts-ignore - chai types issue
import { expect } from "chai";
import hre from "hardhat";
import { AgentFinance } from "../typechain-types/contracts_src/finance/AgentFinance";
import { RFQ } from "../typechain-types/contracts_src/rfq/RFQ";
import { Auction } from "../typechain-types/contracts_src/auction/Auction";
import { AquaIntegration } from "../typechain-types/contracts_src/aqua/AquaIntegration";
import { MockX402Credit } from "../typechain-types/contracts_src/interfaces/MockX402Credit";
import { MockERC20 } from "../typechain-types/contracts_src/interfaces/MockERC20";

describe("AgentFinance Integration", function () {
    let agentFinance: AgentFinance;
    let rfq: RFQ;
    let auction: Auction;
    let aqua: AquaIntegration;
    let mockX402Credit: MockX402Credit;
    let mockToken: MockERC20;

    let owner: any;
    let borrower: any;
    let lender: any;

    beforeEach(async function () {
        [owner, borrower, lender] = await hre.ethers.getSigners();

        const MockERC20Factory = await hre.ethers.getContractFactory(
            "MockERC20"
        );
        const mockTokenDeployed = await MockERC20Factory.deploy(
            "USDC",
            "USDC",
            6
        );
        await mockTokenDeployed.waitForDeployment();
        mockToken = mockTokenDeployed as unknown as MockERC20;

        const MockX402CreditFactory = await hre.ethers.getContractFactory(
            "MockX402Credit"
        );
        const mockX402CreditDeployed = await MockX402CreditFactory.deploy();
        await mockX402CreditDeployed.waitForDeployment();
        mockX402Credit = mockX402CreditDeployed as unknown as MockX402Credit;

        const AquaFactory = await hre.ethers.getContractFactory(
            "AquaIntegration"
        );
        const aquaDeployed = await AquaFactory.deploy(
            await mockTokenDeployed.getAddress(),
            hre.ethers.ZeroAddress
        );
        await aquaDeployed.waitForDeployment();
        aqua = aquaDeployed as unknown as AquaIntegration;

        const RFQFactory = await hre.ethers.getContractFactory("RFQ");
        const rfqDeployed = await RFQFactory.deploy(
            await mockX402CreditDeployed.getAddress()
        );
        await rfqDeployed.waitForDeployment();
        rfq = rfqDeployed as unknown as RFQ;

        const AuctionFactory = await hre.ethers.getContractFactory("Auction");
        const auctionDeployed = await AuctionFactory.deploy(
            await mockX402CreditDeployed.getAddress()
        );
        await auctionDeployed.waitForDeployment();
        auction = auctionDeployed as unknown as Auction;

        const AgentFinanceFactory = await hre.ethers.getContractFactory(
            "AgentFinance"
        );
        const agentFinanceDeployed = await AgentFinanceFactory.deploy(
            await rfqDeployed.getAddress(),
            await auctionDeployed.getAddress(),
            await aquaDeployed.getAddress(),
            await mockX402CreditDeployed.getAddress()
        );
        await agentFinanceDeployed.waitForDeployment();
        agentFinance = agentFinanceDeployed as unknown as AgentFinance;
    });

    it("Should link RFQ to credit line", async function () {
        // Setup - use same decimals for liquidity and credit limit
        const liquidityAmount = hre.ethers.parseUnits("100000", 6); // 100k USDC
        await (mockToken as any).mint(lender.address, liquidityAmount);
        await (mockToken as any)
            .connect(lender)
            .approve(await (aqua as any).getAddress(), liquidityAmount);
        await (aqua as any).connect(lender).connectLiquidity(liquidityAmount);

        // Create and execute RFQ - use same token decimals
        const creditLimit = hre.ethers.parseUnits("1000", 6); // 1k USDC
        await rfq
            .connect(borrower)
            .createRFQ(creditLimit, 30 * 24 * 60 * 60, 1, "ipfs://test");

        await rfq
            .connect(lender)
            .submitQuote(0, 500, creditLimit, hre.ethers.parseUnits("200", 6));
        await rfq.connect(borrower).acceptQuote(0, 0);

        // Execute through AgentFinance
        const executeTx = await agentFinance
            .connect(borrower)
            .executeRFQWithAqua(0);
        await executeTx.wait();

        // Verify link
        const creditLineId = await agentFinance.getCreditLineFromRFQ(0);
        expect(creditLineId).to.be.gt(0n);
    });

    it("Should link Auction to credit line", async function () {
        // Setup - use same decimals for liquidity and credit limit
        const liquidityAmount = hre.ethers.parseUnits("100000", 6); // 100k USDC
        await (mockToken as any).mint(lender.address, liquidityAmount);
        await (mockToken as any)
            .connect(lender)
            .approve(await (aqua as any).getAddress(), liquidityAmount);
        await (aqua as any).connect(lender).connectLiquidity(liquidityAmount);

        // Create and finalize auction - use same token decimals
        const creditLimit = hre.ethers.parseUnits("1000", 6); // 1k USDC
        await auction
            .connect(borrower)
            .createAuction(creditLimit, 30 * 24 * 60 * 60, 3600);

        await auction.connect(lender).placeBid(0, 500, creditLimit);

        await hre.network.provider.send("evm_increaseTime", [3600]);
        await hre.network.provider.send("evm_mine", []);

        await auction.finalizeAuction(0);

        // Settle through AgentFinance
        const settleTx = await agentFinance
            .connect(borrower)
            .settleAuctionWithAqua(0);
        await settleTx.wait();

        // Verify link
        const creditLineId = await agentFinance.getCreditLineFromAuction(0);
        expect(creditLineId).to.be.gt(0n);
    });
});
