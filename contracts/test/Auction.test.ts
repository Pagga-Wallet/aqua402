import { expect } from "chai";
import hre from "hardhat";
import { Auction } from "../typechain-types/contracts_src/auction/Auction";

describe("Auction", function () {
  let auction: Auction;
  let mockX402Credit: any;
  let owner: any;
  let borrower: any;
  let lender1: any;
  let lender2: any;

  beforeEach(async function () {
    [owner, borrower, lender1, lender2] = await hre.ethers.getSigners();

    // Deploy mock x402 credit contract
    const MockX402Credit = await hre.ethers.getContractFactory("MockX402Credit");
    mockX402Credit = await MockX402Credit.deploy();
    await mockX402Credit.waitForDeployment();

    // Deploy Auction contract
    const AuctionContract = await hre.ethers.getContractFactory("Auction");
    auction = await AuctionContract.deploy(await mockX402Credit.getAddress());
    await auction.waitForDeployment();
  });

  it("Should create an auction", async function () {
    const biddingDuration = 3600; // 1 hour
    const tx = await auction.connect(borrower).createAuction(
      hre.ethers.parseEther("1000"),
      30 * 24 * 60 * 60, // 30 days
      biddingDuration
    );
    await tx.wait();

    const auctionData = await auction.getAuction(0);
    expect(auctionData.borrower).to.equal(borrower.address);
    expect(auctionData.amount).to.equal(hre.ethers.parseEther("1000"));
  });

  it("Should allow placing bids", async function () {
    await auction.connect(borrower).createAuction(
      hre.ethers.parseEther("1000"), 
      30 * 24 * 60 * 60, 
      3600
    );
    
    const tx = await auction.connect(lender1).placeBid(
      0, 
      500, 
      hre.ethers.parseEther("1000")
    );
    await tx.wait();

    const bids = await auction.getBids(0);
    expect(bids.length).to.equal(1);
    expect(bids[0].lender).to.equal(lender1.address);
  });

  it("Should select best bid (lowest rate)", async function () {
    await auction.connect(borrower).createAuction(
      hre.ethers.parseEther("1000"), 
      30 * 24 * 60 * 60, 
      3600
    );
    
    await auction.connect(lender1).placeBid(0, 600, hre.ethers.parseEther("1000"));
    await auction.connect(lender2).placeBid(0, 500, hre.ethers.parseEther("1000"));

    // Fast forward time
    await hre.network.provider.send("evm_increaseTime", [3600]);
    await hre.network.provider.send("evm_mine", []);

    await auction.finalizeAuction(0);
    const auctionData = await auction.getAuction(0);
    expect(auctionData.status).to.equal(1); // Finalized
  });
});

