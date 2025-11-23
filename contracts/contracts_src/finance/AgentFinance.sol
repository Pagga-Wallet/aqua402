// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IX402Credit.sol";
import "../aqua/AquaIntegration.sol";
import "../rfq/RFQ.sol";
import "../auction/Auction.sol";

/**
 * @title AgentFinance
 * @notice Finance layer wrapper that connects RFQ/Auction with x402 credit lines and Aqua
 */
contract AgentFinance is Ownable {
    RFQ public rfq;
    Auction public auction;
    AquaIntegration public aqua;
    IX402Credit public x402Credit;

    mapping(uint256 => uint256) public rfqToCreditLine; // rfqId => creditLineId
    mapping(uint256 => uint256) public auctionToCreditLine; // auctionId => creditLineId

    event CreditLineCreatedFromRFQ(uint256 indexed rfqId, uint256 indexed creditLineId);
    event CreditLineCreatedFromAuction(
        uint256 indexed auctionId,
        uint256 indexed creditLineId
    );

    constructor(
        address _rfqAddress,
        address _auctionAddress,
        address _aquaAddress,
        address _x402CreditAddress
    ) Ownable(msg.sender) {
        rfq = RFQ(_rfqAddress);
        auction = Auction(_auctionAddress);
        aqua = AquaIntegration(_aquaAddress);
        x402Credit = IX402Credit(_x402CreditAddress);
    }

    /**
     * @notice Execute RFQ and create credit line with Aqua liquidity
     * @dev Must be called by the borrower
     */
    function executeRFQWithAqua(uint256 rfqId) external returns (uint256) {
        // Get RFQ data to verify caller is borrower
        RFQ.RFQData memory rfqData = rfq.getRFQ(rfqId);
        require(rfqData.borrower == msg.sender, "Only borrower can execute");
        require(uint8(rfqData.status) == 1, "RFQ not closed"); // RFQStatus.Closed = 1
        
        RFQ.Quote[] memory quotes = rfq.getQuotes(rfqId);
        require(quotes.length > 0, "No quotes");

        // Find accepted quote
        RFQ.Quote memory acceptedQuote;
        for (uint256 i = 0; i < quotes.length; i++) {
            if (quotes[i].accepted) {
                acceptedQuote = quotes[i];
                break;
            }
        }
        require(acceptedQuote.lender != address(0), "No accepted quote");

        // Reserve liquidity from Aqua
        aqua.reserveLiquidity(acceptedQuote.lender, acceptedQuote.limit);

        // Create credit line directly through x402 (same logic as RFQ.executeRFQ)
        uint256 creditLineId = x402Credit.openCreditLine(
            rfqData.borrower,
            acceptedQuote.lender,
            acceptedQuote.limit,
            acceptedQuote.rateBps,
            block.timestamp + rfqData.duration
        );
        
        rfqToCreditLine[rfqId] = creditLineId;

        emit CreditLineCreatedFromRFQ(rfqId, creditLineId);
        return creditLineId;
    }

    /**
     * @notice Settle auction and create credit line with Aqua liquidity
     * @dev Must be called by the borrower
     */
    function settleAuctionWithAqua(uint256 auctionId) external returns (uint256) {
        // Get auction data to verify caller is borrower
        Auction.AuctionData memory auctionData = auction.getAuction(auctionId);
        require(auctionData.borrower == msg.sender, "Only borrower can settle");
        // AuctionStatus.Finalized = 1
        require(uint8(auctionData.status) == 1, "Auction not finalized");
        
        // Get winning lender from auction contract
        address winningLender = auction.winningBid(auctionId);
        require(winningLender != address(0), "No winning bid");
        
        Auction.Bid[] memory bids = auction.getBids(auctionId);
        require(bids.length > 0, "No bids");

        // Find winning bid details
        Auction.Bid memory winningBid;
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].isWinning) {
                winningBid = bids[i];
                break;
            }
        }
        require(winningBid.lender != address(0), "No winning bid");

        // Reserve liquidity from Aqua
        aqua.reserveLiquidity(winningLender, winningBid.limit);

        // Create credit line directly through x402 (same logic as Auction.settleAuction)
        uint256 creditLineId = x402Credit.openCreditLine(
            auctionData.borrower,
            winningLender,
            winningBid.limit,
            winningBid.rateBps,
            block.timestamp + auctionData.duration
        );
        
        auctionToCreditLine[auctionId] = creditLineId;

        emit CreditLineCreatedFromAuction(auctionId, creditLineId);
        return creditLineId;
    }

    /**
     * @notice Get credit line ID from RFQ
     */
    function getCreditLineFromRFQ(uint256 rfqId) external view returns (uint256) {
        return rfqToCreditLine[rfqId];
    }

    /**
     * @notice Get credit line ID from auction
     */
    function getCreditLineFromAuction(uint256 auctionId) external view returns (uint256) {
        return auctionToCreditLine[auctionId];
    }
}

