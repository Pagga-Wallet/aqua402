// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IX402Credit.sol";

/**
 * @title RFQ
 * @notice Request for Quote contract for agent financing
 */
contract RFQ is Ownable, ReentrancyGuard {
    enum RFQStatus {
        Open,
        Closed,
        Executed,
        Cancelled
    }

    struct RFQData {
        address borrower;
        uint256 amount;
        uint256 duration;
        uint8 collateralType;
        string flowDescription; // IPFS URI
        RFQStatus status;
        uint256 createdAt;
    }

    struct Quote {
        address lender;
        uint16 rateBps;
        uint256 limit;
        uint256 collateralRequired;
        uint256 submittedAt;
        bool accepted;
    }

    mapping(uint256 => RFQData) public rfqs;
    mapping(uint256 => Quote[]) public quotes; // rfqId => quotes
    mapping(uint256 => uint256) public acceptedQuote; // rfqId => quoteIndex

    uint256 public rfqCounter;
    address public x402CreditAddress;

    event RFQCreated(
        uint256 indexed rfqId,
        address indexed borrower,
        uint256 amount,
        uint256 duration
    );
    event QuoteSubmitted(
        uint256 indexed rfqId,
        address indexed lender,
        uint16 rateBps,
        uint256 limit
    );
    event QuoteAccepted(uint256 indexed rfqId, address indexed lender, uint256 quoteIndex);
    event RFQExecuted(uint256 indexed rfqId, uint256 creditLineId);

    constructor(address _x402CreditAddress) Ownable(msg.sender) {
        x402CreditAddress = _x402CreditAddress;
    }

    /**
     * @notice Create a new RFQ
     */
    function createRFQ(
        uint256 amount,
        uint256 duration,
        uint8 collateralType,
        string memory flowDescription
    ) external returns (uint256) {
        uint256 rfqId = rfqCounter++;
        rfqs[rfqId] = RFQData({
            borrower: msg.sender,
            amount: amount,
            duration: duration,
            collateralType: collateralType,
            flowDescription: flowDescription,
            status: RFQStatus.Open,
            createdAt: block.timestamp
        });

        emit RFQCreated(rfqId, msg.sender, amount, duration);
        return rfqId;
    }

    /**
     * @notice Submit a quote for an RFQ
     */
    function submitQuote(
        uint256 rfqId,
        uint16 rateBps,
        uint256 limit,
        uint256 collateralRequired
    ) external {
        require(rfqs[rfqId].status == RFQStatus.Open, "RFQ not open");
        require(rfqs[rfqId].borrower != msg.sender, "Cannot quote own RFQ");

        quotes[rfqId].push(
            Quote({
                lender: msg.sender,
                rateBps: rateBps,
                limit: limit,
                collateralRequired: collateralRequired,
                submittedAt: block.timestamp,
                accepted: false
            })
        );

        emit QuoteSubmitted(rfqId, msg.sender, rateBps, limit);
    }

    /**
     * @notice Accept a quote
     */
    function acceptQuote(uint256 rfqId, uint256 quoteIndex) external {
        require(rfqs[rfqId].status == RFQStatus.Open, "RFQ not open");
        require(rfqs[rfqId].borrower == msg.sender, "Only borrower can accept");
        require(quoteIndex < quotes[rfqId].length, "Invalid quote index");
        require(!quotes[rfqId][quoteIndex].accepted, "Quote already accepted");

        quotes[rfqId][quoteIndex].accepted = true;
        acceptedQuote[rfqId] = quoteIndex;
        rfqs[rfqId].status = RFQStatus.Closed;

        emit QuoteAccepted(rfqId, quotes[rfqId][quoteIndex].lender, quoteIndex);
    }

    /**
     * @notice Execute RFQ by creating credit line
     */
    function executeRFQ(uint256 rfqId) external nonReentrant returns (uint256) {
        require(rfqs[rfqId].status == RFQStatus.Closed, "RFQ not closed");
        require(rfqs[rfqId].borrower == msg.sender, "Only borrower can execute");

        uint256 quoteIdx = acceptedQuote[rfqId];
        Quote memory quote = quotes[rfqId][quoteIdx];
        RFQData memory rfq = rfqs[rfqId];

        // Create credit line through x402
        IX402Credit x402Credit = IX402Credit(x402CreditAddress);
        uint256 creditLineId = x402Credit.openCreditLine(
            rfq.borrower,
            quote.lender,
            quote.limit,
            quote.rateBps,
            block.timestamp + rfq.duration
        );

        rfqs[rfqId].status = RFQStatus.Executed;

        emit RFQExecuted(rfqId, creditLineId);
        return creditLineId;
    }

    /**
     * @notice Get RFQ data
     */
    function getRFQ(uint256 rfqId) external view returns (RFQData memory) {
        return rfqs[rfqId];
    }

    /**
     * @notice Get quotes for an RFQ
     */
    function getQuotes(uint256 rfqId) external view returns (Quote[] memory) {
        return quotes[rfqId];
    }

    /**
     * @notice Cancel an RFQ
     */
    function cancelRFQ(uint256 rfqId) external {
        require(rfqs[rfqId].borrower == msg.sender, "Only borrower can cancel");
        require(rfqs[rfqId].status == RFQStatus.Open, "RFQ not open");
        rfqs[rfqId].status = RFQStatus.Cancelled;
    }
}

