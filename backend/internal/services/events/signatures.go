package events

import (
	"encoding/hex"

	"golang.org/x/crypto/sha3"
)

// Event signatures (keccak256 hash of event signature)
// These are calculated from Solidity event definitions

// RFQCreated(uint256 indexed rfqId, address indexed borrower, uint256 amount, uint256 duration)
// Signature: keccak256("RFQCreated(uint256,address,uint256,uint256)")
var RFQCreatedSignature = calculateSignature("RFQCreated(uint256,address,uint256,uint256)")

// QuoteSubmitted(uint256 indexed rfqId, address indexed lender, uint16 rateBps, uint256 limit)
// Signature: keccak256("QuoteSubmitted(uint256,address,uint16,uint256)")
var QuoteSubmittedSignature = calculateSignature("QuoteSubmitted(uint256,address,uint16,uint256)")

// QuoteAccepted(uint256 indexed rfqId, address indexed lender, uint256 quoteIndex)
// Signature: keccak256("QuoteAccepted(uint256,address,uint256)")
var QuoteAcceptedSignature = calculateSignature("QuoteAccepted(uint256,address,uint256)")

// RFQExecuted(uint256 indexed rfqId, uint256 creditLineId)
// Signature: keccak256("RFQExecuted(uint256,uint256)")
var RFQExecutedSignature = calculateSignature("RFQExecuted(uint256,uint256)")

// AuctionCreated(uint256 indexed auctionId, address indexed borrower, uint256 amount, uint256 endTime)
// Signature: keccak256("AuctionCreated(uint256,address,uint256,uint256)")
var AuctionCreatedSignature = calculateSignature("AuctionCreated(uint256,address,uint256,uint256)")

// BidPlaced(uint256 indexed auctionId, address indexed lender, uint16 rateBps, uint256 limit)
// Signature: keccak256("BidPlaced(uint256,address,uint16,uint256)")
var BidPlacedSignature = calculateSignature("BidPlaced(uint256,address,uint16,uint256)")

// AuctionFinalized(uint256 indexed auctionId, address indexed winningLender)
// Signature: keccak256("AuctionFinalized(uint256,address)")
var AuctionFinalizedSignature = calculateSignature("AuctionFinalized(uint256,address)")

// AuctionSettled(uint256 indexed auctionId, uint256 creditLineId)
// Signature: keccak256("AuctionSettled(uint256,uint256)")
var AuctionSettledSignature = calculateSignature("AuctionSettled(uint256,uint256)")

// calculateSignature calculates keccak256 hash of event signature
func calculateSignature(signature string) string {
	hash := sha3.NewLegacyKeccak256()
	hash.Write([]byte(signature))
	hashBytes := hash.Sum(nil)
	// Take first 32 bytes (event signature is 32 bytes)
	return "0x" + hex.EncodeToString(hashBytes[:32])
}

