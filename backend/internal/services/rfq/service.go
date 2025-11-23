package rfq

import (
	"context"
	"fmt"
	"time"

	"github.com/aqua-x402/backend/internal/repositories"
	"github.com/aqua-x402/backend/internal/queues"
	"go.uber.org/zap"
)

type Service struct {
	repo   *repositories.RFQRepository
	queue  *queues.Queue
	logger *zap.Logger
}

func NewService(repo *repositories.RFQRepository, queue *queues.Queue, logger *zap.Logger) *Service {
	return &Service{
		repo:   repo,
		queue:  queue,
		logger: logger,
	}
}

type CreateRFQRequest struct {
	BorrowerAddress string `json:"borrower_address"`
	Amount          string `json:"amount"`
	Duration        uint64 `json:"duration"`
	CollateralType  uint8  `json:"collateral_type"`
	FlowDescription string `json:"flow_description"`
}

type QuoteRequest struct {
	RFQID              uint64 `json:"rfq_id"`
	LenderAddress     string `json:"lender_address"`
	RateBps           uint16 `json:"rate_bps"`
	Limit             string `json:"limit"`
	CollateralRequired string `json:"collateral_required"`
}

func (s *Service) CreateRFQ(ctx context.Context, req CreateRFQRequest) (*repositories.RFQModel, error) {
	rfq := &repositories.RFQModel{
		BorrowerAddress: req.BorrowerAddress,
		Amount:          req.Amount,
		Duration:        req.Duration,
		CollateralType:  req.CollateralType,
		FlowDescription: req.FlowDescription,
		Status:          "Open",
		CreatedAt:       time.Now().Unix(),
	}

	if err := s.repo.SaveRFQ(ctx, rfq); err != nil {
		s.logger.Error("Failed to save RFQ", zap.Error(err))
		return nil, fmt.Errorf("failed to save RFQ: %w", err)
	}

	// Publish event to queue
	event := map[string]interface{}{
		"type":    "rfq_created",
		"rfq_id":  rfq.ID,
		"payload": rfq,
	}
	if err := s.queue.Publish("rfq.events", event); err != nil {
		s.logger.Warn("Failed to publish RFQ event", zap.Error(err))
	}

	return rfq, nil
}

func (s *Service) SubmitQuote(ctx context.Context, req QuoteRequest) error {
	// Publish quote submission event
	event := map[string]interface{}{
		"type":           "quote_submitted",
		"rfq_id":         req.RFQID,
		"lender_address": req.LenderAddress,
		"rate_bps":       req.RateBps,
		"limit":          req.Limit,
		"collateral":      req.CollateralRequired,
	}

	if err := s.queue.Publish("rfq.quotes", event); err != nil {
		s.logger.Warn("Failed to publish quote event", zap.Error(err))
		return fmt.Errorf("failed to publish quote: %w", err)
	}

	return nil
}

func (s *Service) GetRFQ(ctx context.Context, id uint64) (*repositories.RFQModel, error) {
	return s.repo.GetRFQ(ctx, id)
}

func (s *Service) ListRFQs(ctx context.Context, limit, offset int) ([]*repositories.RFQModel, error) {
	// TODO: Implement pagination
	return []*repositories.RFQModel{}, nil
}
