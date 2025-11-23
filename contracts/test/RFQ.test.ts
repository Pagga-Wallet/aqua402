/// <reference types="mocha" />
// @ts-ignore - chai types issue
import { expect } from "chai";
import hre from "hardhat";
import { RFQ } from "../typechain-types/contracts_src/rfq/RFQ";

describe("RFQ", function () {
    let rfq: RFQ;
    let mockX402Credit: any;
    let owner: any;
    let borrower: any;
    let lender: any;

    beforeEach(async function () {
        [owner, borrower, lender] = await hre.ethers.getSigners();

        // Deploy mock x402 credit contract
        const MockX402Credit = await hre.ethers.getContractFactory(
            "MockX402Credit"
        );
        mockX402Credit = await MockX402Credit.deploy();
        await mockX402Credit.waitForDeployment();

        // Deploy RFQ contract
        const RFQContract = await hre.ethers.getContractFactory("RFQ");
        const rfqDeployed = await RFQContract.deploy(
            await mockX402Credit.getAddress()
        );
        await rfqDeployed.waitForDeployment();
        rfq = rfqDeployed as unknown as RFQ;
    });

    it("Should create an RFQ", async function () {
        const tx = await rfq.connect(borrower).createRFQ(
            hre.ethers.parseEther("1000"),
            30 * 24 * 60 * 60, // 30 days
            1,
            "ipfs://test"
        );
        await tx.wait();

        const rfqData = await rfq.getRFQ(0);
        expect(rfqData.borrower).to.equal(borrower.address);
        expect(rfqData.amount).to.equal(hre.ethers.parseEther("1000"));
    });

    it("Should submit a quote", async function () {
        await rfq
            .connect(borrower)
            .createRFQ(
                hre.ethers.parseEther("1000"),
                30 * 24 * 60 * 60,
                1,
                "ipfs://test"
            );

        const tx = await rfq
            .connect(lender)
            .submitQuote(
                0,
                500,
                hre.ethers.parseEther("1000"),
                hre.ethers.parseEther("200")
            );
        await tx.wait();

        const quotes = await rfq.getQuotes(0);
        expect(quotes.length).to.equal(1);
        expect(quotes[0].lender).to.equal(lender.address);
    });
});
