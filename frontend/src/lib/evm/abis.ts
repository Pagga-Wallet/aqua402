// Import JSON ABI from compiled contract artifacts
import auctionArtifact from './abis-json/auction.json'
import rfqArtifact from './abis-json/rfq.json'

// Extract ABI from artifacts
export const RFQ_ABI = rfqArtifact.abi
export const AUCTION_ABI = auctionArtifact.abi

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

