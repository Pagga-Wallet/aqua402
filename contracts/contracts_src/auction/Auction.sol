// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IX402Credit.sol";

/**
 * @title Auction
 * @notice Auction contract for competitive bidding on credit lines
 */
contract Auction is Ownable, ReentrancyGuard {
    enum AuctionStatus {
        Open,
        Finalized,
        Settled,
        Cancelled
    }

    struct AuctionData {
        address borrower;
        uint256 amount;
        uint256 duration;
        uint256 endTime;
        AuctionStatus status;
        uint256 createdAt;
    }

    struct Bid {
        address lender;
        uint16 rateBps;
        uint256 limit;
        uint256 timestamp;
        bool isWinning;
    }

    mapping(uint256 => AuctionData) public auctions;
    mapping(uint256 => Bid[]) public bids; // auctionId => bids
    mapping(uint256 => address) public winningBid; // auctionId => winning lender

    uint256 public auctionCounter;
    address public x402CreditAddress;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed borrower,
        uint256 amount,
        uint256 endTime
    );
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed lender,
        uint16 rateBps,
        uint256 limit
    );
    event AuctionFinalized(uint256 indexed auctionId, address indexed winningLender);
    event AuctionSettled(uint256 indexed auctionId, uint256 creditLineId);

    constructor(address _x402CreditAddress) Ownable(msg.sender) {
        x402CreditAddress = _x402CreditAddress;
    }

    /**
     * @notice Create a new auction
     */
    function createAuction(
        uint256 amount,
        uint256 duration,
        uint256 biddingDuration
    ) external returns (uint256) {
        uint256 auctionId = auctionCounter++;
        auctions[auctionId] = AuctionData({
            borrower: msg.sender,
            amount: amount,
            duration: duration,
            endTime: block.timestamp + biddingDuration,
            status: AuctionStatus.Open,
            createdAt: block.timestamp
        });

        emit AuctionCreated(auctionId, msg.sender, amount, auctions[auctionId].endTime);
        return auctionId;
    }

    /**
     * @notice Place a bid in the auction
     */
    function placeBid(
        uint256 auctionId,
        uint16 rateBps,
        uint256 limit
    ) external {
        require(auctions[auctionId].status == AuctionStatus.Open, "Auction not open");
        require(block.timestamp < auctions[auctionId].endTime, "Auction ended");
        require(auctions[auctionId].borrower != msg.sender, "Cannot bid on own auction");

        bids[auctionId].push(
            Bid({
                lender: msg.sender,
                rateBps: rateBps,
                limit: limit,
                timestamp: block.timestamp,
                isWinning: false
            })
        );

        emit BidPlaced(auctionId, msg.sender, rateBps, limit);
    }

    /**
     * @notice Finalize auction by selecting best bid (lowest rate)
     */
    function finalizeAuction(uint256 auctionId) external {
        require(auctions[auctionId].status == AuctionStatus.Open, "Auction not open");
        require(block.timestamp >= auctions[auctionId].endTime, "Auction still active");
        require(bids[auctionId].length > 0, "No bids");

        // Find best bid (lowest rate, then highest limit)
        uint256 bestBidIndex = 0;
        Bid memory bestBid = bids[auctionId][0];

        for (uint256 i = 1; i < bids[auctionId].length; i++) {
            Bid memory currentBid = bids[auctionId][i];
            if (
                currentBid.rateBps < bestBid.rateBps ||
                (currentBid.rateBps == bestBid.rateBps && currentBid.limit > bestBid.limit)
            ) {
                bestBid = currentBid;
                bestBidIndex = i;
            }
        }

        bids[auctionId][bestBidIndex].isWinning = true;
        winningBid[auctionId] = bestBid.lender;
        auctions[auctionId].status = AuctionStatus.Finalized;

        emit AuctionFinalized(auctionId, bestBid.lender);
    }

    /**
     * @notice Settle auction by creating credit line
     */
    function settleAuction(uint256 auctionId) external nonReentrant returns (uint256) {
        require(auctions[auctionId].status == AuctionStatus.Finalized, "Auction not finalized");
        require(auctions[auctionId].borrower == msg.sender, "Only borrower can settle");

        AuctionData memory auction = auctions[auctionId];
        address lender = winningBid[auctionId];

        // Find winning bid
        Bid memory winningBidData;
        for (uint256 i = 0; i < bids[auctionId].length; i++) {
            if (bids[auctionId][i].isWinning) {
                winningBidData = bids[auctionId][i];
                break;
            }
        }

        // Create credit line through x402
        IX402Credit x402Credit = IX402Credit(x402CreditAddress);
        uint256 creditLineId = x402Credit.openCreditLine(
            auction.borrower,
            lender,
            winningBidData.limit,
            winningBidData.rateBps,
            block.timestamp + auction.duration
        );

        auctions[auctionId].status = AuctionStatus.Settled;

        emit AuctionSettled(auctionId, creditLineId);
        return creditLineId;
    }

    /**
     * @notice Get auction data
     */
    function getAuction(uint256 auctionId) external view returns (AuctionData memory) {
        return auctions[auctionId];
    }

    /**
     * @notice Get bids for an auction
     */
    function getBids(uint256 auctionId) external view returns (Bid[] memory) {
        return bids[auctionId];
    }

    /**
     * @notice Cancel an auction
     */
    function cancelAuction(uint256 auctionId) external {
        require(auctions[auctionId].borrower == msg.sender, "Only borrower can cancel");
        require(auctions[auctionId].status == AuctionStatus.Open, "Auction not open");
        auctions[auctionId].status = AuctionStatus.Cancelled;
    }
}

