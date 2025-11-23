package aqua

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

type ConnectLiquidityRequest struct {
	LenderAddress string `json:"lender_address"`
	Amount        string `json:"amount"`
	TokenAddress  string `json:"token_address"`
}

type WithdrawLiquidityRequest struct {
	LenderAddress string `json:"lender_address"`
	Amount        string `json:"amount"`
}

func (s *Service) ConnectLiquidity(ctx context.Context, req ConnectLiquidityRequest) error {
	event := map[string]interface{}{
		"type":          "liquidity_connected",
		"lender_address": req.LenderAddress,
		"amount":        req.Amount,
		"token_address": req.TokenAddress,
	}

	if err := s.queue.Publish("aqua.liquidity", event); err != nil {
		s.logger.Error("Failed to publish liquidity event", zap.Error(err))
		return fmt.Errorf("failed to connect liquidity: %w", err)
	}

	return nil
}

func (s *Service) WithdrawLiquidity(ctx context.Context, req WithdrawLiquidityRequest) error {
	event := map[string]interface{}{
		"type":          "liquidity_withdrawn",
		"lender_address": req.LenderAddress,
		"amount":        req.Amount,
	}

	if err := s.queue.Publish("aqua.liquidity", event); err != nil {
		s.logger.Error("Failed to publish withdrawal event", zap.Error(err))
		return fmt.Errorf("failed to withdraw liquidity: %w", err)
	}

	return nil
}

func (s *Service) GetAvailableLiquidity(ctx context.Context, lenderAddress string) (map[string]interface{}, error) {
	// TODO: Query from on-chain or cache
	return map[string]interface{}{
		"lender_address": lenderAddress,
		"available":      "0",
		"reserved":       "0",
		"total":          "0",
	}, nil
}

