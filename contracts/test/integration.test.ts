/// <reference types="mocha" />
// @ts-ignore - chai types issue
import { expect } from "chai";
import hre from "hardhat";
import { RFQ } from "../typechain-types/contracts_src/rfq/RFQ";
import { Auction } from "../typechain-types/contracts_src/auction/Auction";
import { AquaIntegration } from "../typechain-types/contracts_src/aqua/AquaIntegration";
import { AgentFinance } from "../typechain-types/contracts_src/finance/AgentFinance";
import { MockX402Credit } from "../typechain-types/contracts_src/interfaces/MockX402Credit";
import { MockERC20 } from "../typechain-types/contracts_src/interfaces/MockERC20";

describe("Integration Tests", function () {
    let rfq: RFQ;
    let auction: Auction;
    let aqua: AquaIntegration;
    let agentFinance: AgentFinance;
    let mockX402Credit: MockX402Credit;
    let mockToken: MockERC20;

    let owner: any;
    let borrower: any;
    let lender1: any;
    let lender2: any;

    beforeEach(async function () {
        [owner, borrower, lender1, lender2] = await hre.ethers.getSigners();

        // Deploy mock ERC20 token
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

        // Deploy mock x402 credit
        const MockX402CreditFactory = await hre.ethers.getContractFactory(
            "MockX402Credit"
        );
        const mockX402CreditDeployed = await MockX402CreditFactory.deploy();
        await mockX402CreditDeployed.waitForDeployment();
        mockX402Credit = mockX402CreditDeployed as unknown as MockX402Credit;

        // Deploy AquaIntegration
        const AquaFactory = await hre.ethers.getContractFactory(
            "AquaIntegration"
        );
        const aquaDeployed = await AquaFactory.deploy(
            await mockTokenDeployed.getAddress(),
            hre.ethers.ZeroAddress
        );
        await aquaDeployed.waitForDeployment();
        aqua = aquaDeployed as unknown as AquaIntegration;

        // Deploy RFQ
        const RFQFactory = await hre.ethers.getContractFactory("RFQ");
        const rfqDeployed = await RFQFactory.deploy(
            await mockX402CreditDeployed.getAddress()
        );
        await rfqDeployed.waitForDeployment();
        rfq = rfqDeployed as unknown as RFQ;

        // Deploy Auction
        const AuctionFactory = await hre.ethers.getContractFactory("Auction");
        const auctionDeployed = await AuctionFactory.deploy(
            await mockX402CreditDeployed.getAddress()
        );
        await auctionDeployed.waitForDeployment();
        auction = auctionDeployed as unknown as Auction;

        // Deploy AgentFinance
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

    it("Should complete full RFQ flow with Aqua", async function () {
        // 1. Lender connects liquidity to Aqua
        const liquidityAmount = hre.ethers.parseUnits("100000", 6); // 100k USDC
        await (mockToken as any).mint(lender1.address, liquidityAmount);
        await (mockToken as any)
            .connect(lender1)
            .approve(await (aqua as any).getAddress(), liquidityAmount);
        await (aqua as any).connect(lender1).connectLiquidity(liquidityAmount);

        // 2. Borrower creates RFQ - use same token decimals
        const creditLimit = hre.ethers.parseUnits("1000", 6); // 1k USDC
        const rfqTx = await rfq.connect(borrower).createRFQ(
            creditLimit,
            30 * 24 * 60 * 60, // 30 days
            1,
            "ipfs://test-flow"
        );
        await rfqTx.wait();
        const rfqId = 0;

        // 3. Lender submits quote
        const quoteTx = await rfq.connect(lender1).submitQuote(
            rfqId,
            500, // 5% rate
            creditLimit,
            hre.ethers.parseUnits("200", 6)
        );
        await quoteTx.wait();

        // 4. Borrower accepts quote
        await rfq.connect(borrower).acceptQuote(rfqId, 0);

        // 5. Execute RFQ with Aqua integration
        const executeTx = await agentFinance
            .connect(borrower)
            .executeRFQWithAqua(rfqId);
        await executeTx.wait();

        // Verify credit line was created
        const creditLineId = await agentFinance.getCreditLineFromRFQ(rfqId);
        expect(creditLineId).to.be.gt(0n);

        // Verify liquidity was reserved
        const reserved = await (aqua as any).liquidityReserved(lender1.address);
        expect(reserved).to.equal(creditLimit);
    });

    it("Should complete full Auction flow with Aqua", async function () {
        // 1. Lenders connect liquidity
        const liquidityAmount = hre.ethers.parseUnits("100000", 6); // 100k USDC
        await (mockToken as any).mint(lender1.address, liquidityAmount);
        await (mockToken as any).mint(lender2.address, liquidityAmount);
        await (mockToken as any)
            .connect(lender1)
            .approve(await (aqua as any).getAddress(), liquidityAmount);
        await (mockToken as any)
            .connect(lender2)
            .approve(await (aqua as any).getAddress(), liquidityAmount);
        await (aqua as any).connect(lender1).connectLiquidity(liquidityAmount);
        await (aqua as any).connect(lender2).connectLiquidity(liquidityAmount);

        // 2. Borrower creates auction - use same token decimals
        const creditLimit = hre.ethers.parseUnits("1000", 6); // 1k USDC
        const auctionTx = await auction.connect(borrower).createAuction(
            creditLimit,
            30 * 24 * 60 * 60, // 30 days
            3600 // 1 hour bidding
        );
        await auctionTx.wait();
        const auctionId = 0;

        // 3. Lenders place bids
        await auction.connect(lender1).placeBid(auctionId, 600, creditLimit);
        await auction.connect(lender2).placeBid(auctionId, 500, creditLimit);

        // 4. Fast forward time
        await hre.network.provider.send("evm_increaseTime", [3600]);
        await hre.network.provider.send("evm_mine", []);

        // 5. Finalize auction
        await auction.finalizeAuction(auctionId);

        // 6. Settle auction with Aqua integration
        const settleTx = await agentFinance
            .connect(borrower)
            .settleAuctionWithAqua(auctionId);
        await settleTx.wait();

        // Verify credit line was created
        const creditLineId = await agentFinance.getCreditLineFromAuction(
            auctionId
        );
        expect(creditLineId).to.be.gt(0n);

        // Verify winning bid (lender2 with lower rate)
        const bids = await (auction as any).getBids(auctionId);
        const winningBid = bids.find((b: any) => b.isWinning);
        expect(winningBid?.lender).to.equal(lender2.address);
    });

    it("Should handle multiple RFQs and quotes", async function () {
        // Setup liquidity
        const liquidityAmount = hre.ethers.parseUnits("200000", 6); // 200k USDC
        await (mockToken as any).mint(lender1.address, liquidityAmount);
        await (mockToken as any)
            .connect(lender1)
            .approve(await (aqua as any).getAddress(), liquidityAmount);
        await (aqua as any).connect(lender1).connectLiquidity(liquidityAmount);

        // Create multiple RFQs - use same token decimals
        await rfq
            .connect(borrower)
            .createRFQ(
                hre.ethers.parseUnits("500", 6),
                30 * 24 * 60 * 60,
                1,
                "ipfs://1"
            );
        await rfq
            .connect(borrower)
            .createRFQ(
                hre.ethers.parseUnits("1000", 6),
                30 * 24 * 60 * 60,
                1,
                "ipfs://2"
            );

        // Submit quotes for both
        await rfq
            .connect(lender1)
            .submitQuote(
                0,
                500,
                hre.ethers.parseUnits("500", 6),
                hre.ethers.parseUnits("100", 6)
            );
        await rfq
            .connect(lender1)
            .submitQuote(
                1,
                550,
                hre.ethers.parseUnits("1000", 6),
                hre.ethers.parseUnits("200", 6)
            );

        // Verify both RFQs have quotes
        const quotes1 = await rfq.getQuotes(0);
        const quotes2 = await rfq.getQuotes(1);
        expect(quotes1.length).to.equal(1);
        expect(quotes2.length).to.equal(1);
    });
});
