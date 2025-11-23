package events

import (
	"context"
	"fmt"
	"math/big"
	"time"

	"github.com/aqua-x402/backend/internal/queues"
	"github.com/aqua-x402/backend/internal/repositories"
	"github.com/aqua-x402/backend/pkg/evm"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"go.uber.org/zap"
)

// Monitor monitors blockchain events and processes them
type Monitor struct {
	evmClient   *evm.Client
	queue       *queues.Queue
	rfqRepo     *repositories.RFQRepository
	logger      *zap.Logger
	rfqAddress  common.Address
	auctionAddress common.Address
	lastBlock   uint64
}

// NewMonitor creates a new event monitor
func NewMonitor(
	evmClient *evm.Client,
	queue *queues.Queue,
	rfqRepo *repositories.RFQRepository,
	rfqAddress, auctionAddress string,
	logger *zap.Logger,
) (*Monitor, error) {
	rfqAddr := common.HexToAddress(rfqAddress)
	auctionAddr := common.HexToAddress(auctionAddress)

	// Get current block number
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	blockNumber, err := evmClient.BlockNumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get block number: %w", err)
	}

	return &Monitor{
		evmClient:      evmClient,
		queue:          queue,
		rfqRepo:        rfqRepo,
		logger:         logger,
		rfqAddress:     rfqAddr,
		auctionAddress: auctionAddr,
		lastBlock:      blockNumber,
	}, nil
}

// Start starts monitoring blockchain events
func (m *Monitor) Start(ctx context.Context) error {
	m.logger.Info("Starting event monitor", 
		zap.String("rfq_address", m.rfqAddress.Hex()),
		zap.String("auction_address", m.auctionAddress.Hex()),
		zap.Uint64("starting_block", m.lastBlock))

	// Start polling for new blocks
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			m.logger.Info("Event monitor stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := m.processNewBlocks(ctx); err != nil {
				m.logger.Error("Error processing blocks", zap.Error(err))
			}
		}
	}
}

// processNewBlocks processes new blocks and extracts events
func (m *Monitor) processNewBlocks(ctx context.Context) error {
	currentBlock, err := m.evmClient.BlockNumber(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current block: %w", err)
	}

	if currentBlock <= m.lastBlock {
		return nil // No new blocks
	}

	// Process blocks from lastBlock+1 to currentBlock
	fromBlock := m.lastBlock + 1
	toBlock := currentBlock

	m.logger.Debug("Processing blocks",
		zap.Uint64("from", fromBlock),
		zap.Uint64("to", toBlock))

	// Create filter query for RFQ events
	rfqQuery := ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(fromBlock),
		ToBlock:   new(big.Int).SetUint64(toBlock),
		Addresses: []common.Address{m.rfqAddress},
	}

	// Create filter query for Auction events
	auctionQuery := ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(fromBlock),
		ToBlock:   new(big.Int).SetUint64(toBlock),
		Addresses: []common.Address{m.auctionAddress},
	}

	// Get RFQ logs
	rfqLogs, err := m.evmClient.FilterLogs(ctx, rfqQuery)
	if err != nil {
		m.logger.Warn("Failed to filter RFQ logs", zap.Error(err))
	} else {
		for _, log := range rfqLogs {
			if err := m.processRFQEvent(ctx, log); err != nil {
				m.logger.Error("Failed to process RFQ event", zap.Error(err), zap.String("tx_hash", log.TxHash.Hex()))
			}
		}
	}

	// Get Auction logs
	auctionLogs, err := m.evmClient.FilterLogs(ctx, auctionQuery)
	if err != nil {
		m.logger.Warn("Failed to filter Auction logs", zap.Error(err))
	} else {
		for _, log := range auctionLogs {
			if err := m.processAuctionEvent(ctx, log); err != nil {
				m.logger.Error("Failed to process Auction event", zap.Error(err), zap.String("tx_hash", log.TxHash.Hex()))
			}
		}
	}

	m.lastBlock = toBlock
	return nil
}

// processRFQEvent processes RFQ contract events
func (m *Monitor) processRFQEvent(ctx context.Context, log types.Log) error {
	if log.Address != m.rfqAddress {
		return nil
	}

	if len(log.Topics) == 0 {
		return nil
	}

	eventSig := log.Topics[0]
	eventSigStr := eventSig.Hex()

	// Identify event by signature
	switch eventSigStr {
	case RFQCreatedSignature:
		return m.processRFQCreated(ctx, log)
	case QuoteSubmittedSignature:
		return m.processQuoteSubmitted(ctx, log)
	case QuoteAcceptedSignature:
		return m.processQuoteAccepted(ctx, log)
	case RFQExecutedSignature:
		return m.processRFQExecuted(ctx, log)
	default:
		m.logger.Debug("Unknown RFQ event signature", zap.String("signature", eventSigStr))
		return nil
	}
}

// processRFQCreated processes RFQCreated event
// RFQCreated(uint256 indexed rfqId, address indexed borrower, uint256 amount, uint256 duration)
func (m *Monitor) processRFQCreated(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 3 || len(log.Data) < 64 {
		return fmt.Errorf("invalid RFQCreated event data")
	}

	rfqId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	borrower := common.BytesToAddress(log.Topics[2].Bytes())
	
	// Decode amount and duration from data (they are not indexed)
	amount := new(big.Int).SetBytes(log.Data[0:32])
	duration := new(big.Int).SetBytes(log.Data[32:64])

	eventData := map[string]interface{}{
		"type":            "rfq_created",
		"rfq_id":          rfqId.String(),
		"borrower":        borrower.Hex(),
		"amount":          amount.String(),
		"duration":        duration.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("rfq.events", eventData); err != nil {
		return fmt.Errorf("failed to publish RFQCreated event: %w", err)
	}

	m.logger.Info("Processed RFQCreated event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("rfq_id", rfqId.String()),
		zap.String("borrower", borrower.Hex()),
		zap.String("amount", amount.String()),
		zap.String("duration", duration.String()))

	return nil
}

// processQuoteSubmitted processes QuoteSubmitted event
// QuoteSubmitted(uint256 indexed rfqId, address indexed lender, uint16 rateBps, uint256 limit)
func (m *Monitor) processQuoteSubmitted(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 3 || len(log.Data) < 64 {
		return fmt.Errorf("invalid QuoteSubmitted event data")
	}

	rfqId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	lender := common.BytesToAddress(log.Topics[2].Bytes())
	
	// Decode rateBps (uint16) and limit (uint256) from data
	// rateBps is in first 32 bytes (padded), limit is in next 32 bytes
	rateBps := new(big.Int).SetBytes(log.Data[30:32]) // Last 2 bytes of first 32 bytes
	limit := new(big.Int).SetBytes(log.Data[32:64])

	eventData := map[string]interface{}{
		"type":            "quote_submitted",
		"rfq_id":          rfqId.String(),
		"lender":          lender.Hex(),
		"rate_bps":        rateBps.Uint64(),
		"limit":           limit.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("rfq.quotes", eventData); err != nil {
		return fmt.Errorf("failed to publish QuoteSubmitted event: %w", err)
	}

	m.logger.Info("Processed QuoteSubmitted event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("rfq_id", rfqId.String()),
		zap.String("lender", lender.Hex()),
		zap.Uint64("rate_bps", rateBps.Uint64()),
		zap.String("limit", limit.String()))

	return nil
}

// processQuoteAccepted processes QuoteAccepted event
// QuoteAccepted(uint256 indexed rfqId, address indexed lender, uint256 quoteIndex)
func (m *Monitor) processQuoteAccepted(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 3 || len(log.Data) < 32 {
		return fmt.Errorf("invalid QuoteAccepted event data")
	}

	rfqId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	lender := common.BytesToAddress(log.Topics[2].Bytes())
	quoteIndex := new(big.Int).SetBytes(log.Data[0:32])

	eventData := map[string]interface{}{
		"type":            "quote_accepted",
		"rfq_id":          rfqId.String(),
		"lender":          lender.Hex(),
		"quote_index":     quoteIndex.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("rfq.events", eventData); err != nil {
		return fmt.Errorf("failed to publish QuoteAccepted event: %w", err)
	}

	m.logger.Info("Processed QuoteAccepted event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("rfq_id", rfqId.String()),
		zap.String("lender", lender.Hex()))

	return nil
}

// processRFQExecuted processes RFQExecuted event
// RFQExecuted(uint256 indexed rfqId, uint256 creditLineId)
func (m *Monitor) processRFQExecuted(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 2 {
		return fmt.Errorf("invalid RFQExecuted event data")
	}

	rfqId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	creditLineId := new(big.Int).SetBytes(log.Data[0:32])

	eventData := map[string]interface{}{
		"type":            "rfq_executed",
		"rfq_id":          rfqId.String(),
		"credit_line_id":  creditLineId.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("rfq.events", eventData); err != nil {
		return fmt.Errorf("failed to publish RFQExecuted event: %w", err)
	}

	m.logger.Info("Processed RFQExecuted event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("rfq_id", rfqId.String()),
		zap.String("credit_line_id", creditLineId.String()))

	return nil
}

// processAuctionEvent processes Auction contract events
func (m *Monitor) processAuctionEvent(ctx context.Context, log types.Log) error {
	if log.Address != m.auctionAddress {
		return nil
	}

	if len(log.Topics) == 0 {
		return nil
	}

	eventSig := log.Topics[0]
	eventSigStr := eventSig.Hex()

	// Identify event by signature
	switch eventSigStr {
	case AuctionCreatedSignature:
		return m.processAuctionCreated(ctx, log)
	case BidPlacedSignature:
		return m.processBidPlaced(ctx, log)
	case AuctionFinalizedSignature:
		return m.processAuctionFinalized(ctx, log)
	case AuctionSettledSignature:
		return m.processAuctionSettled(ctx, log)
	default:
		m.logger.Debug("Unknown Auction event signature", zap.String("signature", eventSigStr))
		return nil
	}
}

// processAuctionCreated processes AuctionCreated event
// AuctionCreated(uint256 indexed auctionId, address indexed borrower, uint256 amount, uint256 endTime)
func (m *Monitor) processAuctionCreated(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 3 || len(log.Data) < 64 {
		return fmt.Errorf("invalid AuctionCreated event data")
	}

	auctionId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	borrower := common.BytesToAddress(log.Topics[2].Bytes())
	
	// Decode amount and endTime from data
	amount := new(big.Int).SetBytes(log.Data[0:32])
	endTime := new(big.Int).SetBytes(log.Data[32:64])

	eventData := map[string]interface{}{
		"type":            "auction_created",
		"auction_id":      auctionId.String(),
		"borrower":        borrower.Hex(),
		"amount":          amount.String(),
		"end_time":        endTime.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("auction.events", eventData); err != nil {
		return fmt.Errorf("failed to publish AuctionCreated event: %w", err)
	}

	m.logger.Info("Processed AuctionCreated event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("auction_id", auctionId.String()),
		zap.String("borrower", borrower.Hex()))

	return nil
}

// processBidPlaced processes BidPlaced event
// BidPlaced(uint256 indexed auctionId, address indexed lender, uint16 rateBps, uint256 limit)
func (m *Monitor) processBidPlaced(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 3 || len(log.Data) < 64 {
		return fmt.Errorf("invalid BidPlaced event data")
	}

	auctionId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	lender := common.BytesToAddress(log.Topics[2].Bytes())
	
	// Decode rateBps and limit from data
	rateBps := new(big.Int).SetBytes(log.Data[30:32])
	limit := new(big.Int).SetBytes(log.Data[32:64])

	eventData := map[string]interface{}{
		"type":            "bid_placed",
		"auction_id":      auctionId.String(),
		"lender":          lender.Hex(),
		"rate_bps":        rateBps.Uint64(),
		"limit":           limit.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("auction.bids", eventData); err != nil {
		return fmt.Errorf("failed to publish BidPlaced event: %w", err)
	}

	m.logger.Info("Processed BidPlaced event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("auction_id", auctionId.String()),
		zap.String("lender", lender.Hex()))

	return nil
}

// processAuctionFinalized processes AuctionFinalized event
// AuctionFinalized(uint256 indexed auctionId, address indexed winningLender)
func (m *Monitor) processAuctionFinalized(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 3 {
		return fmt.Errorf("invalid AuctionFinalized event data")
	}

	auctionId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	winningLender := common.BytesToAddress(log.Topics[2].Bytes())

	eventData := map[string]interface{}{
		"type":            "auction_finalized",
		"auction_id":      auctionId.String(),
		"winning_lender":  winningLender.Hex(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("auction.events", eventData); err != nil {
		return fmt.Errorf("failed to publish AuctionFinalized event: %w", err)
	}

	m.logger.Info("Processed AuctionFinalized event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("auction_id", auctionId.String()))

	return nil
}

// processAuctionSettled processes AuctionSettled event
// AuctionSettled(uint256 indexed auctionId, uint256 creditLineId)
func (m *Monitor) processAuctionSettled(ctx context.Context, log types.Log) error {
	if len(log.Topics) < 2 {
		return fmt.Errorf("invalid AuctionSettled event data")
	}

	auctionId := new(big.Int).SetBytes(log.Topics[1].Bytes())
	creditLineId := new(big.Int).SetBytes(log.Data[0:32])

	eventData := map[string]interface{}{
		"type":            "auction_settled",
		"auction_id":      auctionId.String(),
		"credit_line_id":  creditLineId.String(),
		"tx_hash":         log.TxHash.Hex(),
		"block_number":    log.BlockNumber,
		"block_hash":      log.BlockHash.Hex(),
		"log_index":       log.Index,
		"contract_address": log.Address.Hex(),
	}

	// Publish to RabbitMQ
	if err := m.queue.Publish("auction.events", eventData); err != nil {
		return fmt.Errorf("failed to publish AuctionSettled event: %w", err)
	}

	m.logger.Info("Processed AuctionSettled event",
		zap.String("tx_hash", log.TxHash.Hex()),
		zap.String("auction_id", auctionId.String()))

	return nil
}

