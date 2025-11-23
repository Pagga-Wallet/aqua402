// Placeholder ABI - will be generated from contracts after compilation
export const RFQ_ABI = [
  "function createRFQ(uint256 amount, uint256 duration, uint8 collateralType, string memory flowDescription) external returns (uint256)",
  "function submitQuote(uint256 rfqId, uint16 rateBps, uint256 limit, uint256 collateralRequired) external",
  "function acceptQuote(uint256 rfqId, uint256 quoteIndex) external",
  "function executeRFQ(uint256 rfqId) external returns (uint256)",
  "function getRFQ(uint256 rfqId) external view returns (tuple(address borrower, uint256 amount, uint256 duration, uint8 collateralType, string flowDescription, uint8 status, uint256 createdAt))",
  "function getQuotes(uint256 rfqId) external view returns (tuple(address lender, uint16 rateBps, uint256 limit, uint256 collateralRequired, uint256 submittedAt, bool accepted)[])",
  "event RFQCreated(uint256 indexed rfqId, address indexed borrower, uint256 amount, uint256 duration)",
  "event QuoteSubmitted(uint256 indexed rfqId, address indexed lender, uint16 rateBps, uint256 limit)",
  "event QuoteAccepted(uint256 indexed rfqId, address indexed lender, uint256 quoteIndex)",
  "event RFQExecuted(uint256 indexed rfqId, uint256 creditLineId)",
]

export const AUCTION_ABI = [
  "function createAuction(uint256 amount, uint256 duration, uint256 biddingDuration) external returns (uint256)",
  "function placeBid(uint256 auctionId, uint16 rateBps, uint256 limit) external",
  "function finalizeAuction(uint256 auctionId) external",
  "function settleAuction(uint256 auctionId) external returns (uint256)",
  "function getAuction(uint256 auctionId) external view returns (tuple(address borrower, uint256 amount, uint256 duration, uint256 endTime, uint8 status, uint256 createdAt))",
  "function getBids(uint256 auctionId) external view returns (tuple(address lender, uint16 rateBps, uint256 limit, uint256 timestamp, bool isWinning)[])",
  "event AuctionCreated(uint256 indexed auctionId, address indexed borrower, uint256 amount, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address indexed lender, uint16 rateBps, uint256 limit)",
  "event AuctionFinalized(uint256 indexed auctionId, address indexed winningLender)",
  "event AuctionSettled(uint256 indexed auctionId, uint256 creditLineId)",
]

export const AQUA_ABI = [
  "function connectLiquidity(uint256 amount) external",
  "function withdrawLiquidity(uint256 amount) external",
  "function reserveLiquidity(address lender, uint256 amount) external",
  "function releaseLiquidity(address lender, uint256 amount) external",
  "function getAvailableLiquidity(address lender) external view returns (uint256)",
  "event LiquidityConnected(address indexed lender, uint256 amount)",
  "event LiquidityWithdrawn(address indexed lender, uint256 amount)",
  "event LiquidityReserved(address indexed lender, uint256 amount)",
  "event LiquidityReleased(address indexed lender, uint256 amount)",
]

export const AGENT_FINANCE_ABI = [
  "function executeRFQWithAqua(uint256 rfqId) external returns (uint256)",
  "function settleAuctionWithAqua(uint256 auctionId) external returns (uint256)",
  "function getCreditLineFromRFQ(uint256 rfqId) external view returns (uint256)",
  "function getCreditLineFromAuction(uint256 auctionId) external view returns (uint256)",
  "event CreditLineCreatedFromRFQ(uint256 indexed rfqId, uint256 indexed creditLineId)",
  "event CreditLineCreatedFromAuction(uint256 indexed auctionId, uint256 indexed creditLineId)",
]

