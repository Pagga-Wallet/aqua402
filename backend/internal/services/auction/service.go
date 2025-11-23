package auction

import (
	"context"
	"fmt"

	"github.com/aqua-x402/backend/internal/queues"
	"go.uber.org/zap"
)

type Service struct {
	queue  *queues.Queue
	logger *zap.Logger
}

func NewService(queue *queues.Queue, logger *zap.Logger) *Service {
	return &Service{
		queue:  queue,
		logger: logger,
	}
}

type CreateAuctionRequest struct {
	BorrowerAddress string `json:"borrower_address"`
	Amount          string `json:"amount"`
	Duration        uint64 `json:"duration"`
	BiddingDuration uint64 `json:"bidding_duration"`
}

type BidRequest struct {
	AuctionID   uint64 `json:"auction_id"`
	LenderAddress string `json:"lender_address"`
	RateBps     uint16 `json:"rate_bps"`
	Limit       string `json:"limit"`
}

func (s *Service) CreateAuction(ctx context.Context, req CreateAuctionRequest) (map[string]interface{}, error) {
	auction := map[string]interface{}{
		"borrower_address": req.BorrowerAddress,
		"amount":          req.Amount,
		"duration":        req.Duration,
		"bidding_duration": req.BiddingDuration,
		"status":          "Open",
	}

	event := map[string]interface{}{
		"type":    "auction_created",
		"payload": auction,
	}

	if err := s.queue.Publish("auction.events", event); err != nil {
		s.logger.Error("Failed to publish auction event", zap.Error(err))
		return nil, fmt.Errorf("failed to create auction: %w", err)
	}

	return auction, nil
}

func (s *Service) PlaceBid(ctx context.Context, req BidRequest) error {
	event := map[string]interface{}{
		"type":          "bid_placed",
		"auction_id":    req.AuctionID,
		"lender_address": req.LenderAddress,
		"rate_bps":      req.RateBps,
		"limit":         req.Limit,
	}

	if err := s.queue.Publish("auction.bids", event); err != nil {
		s.logger.Error("Failed to publish bid event", zap.Error(err))
		return fmt.Errorf("failed to place bid: %w", err)
	}

	return nil
}

func (s *Service) FinalizeAuction(ctx context.Context, auctionID uint64) error {
	event := map[string]interface{}{
		"type":       "auction_finalized",
		"auction_id": auctionID,
	}

	if err := s.queue.Publish("auction.events", event); err != nil {
		s.logger.Error("Failed to publish finalization event", zap.Error(err))
		return fmt.Errorf("failed to finalize auction: %w", err)
	}

	return nil
}

