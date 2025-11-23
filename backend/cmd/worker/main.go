package main

import (
	"context"
	"encoding/json"
	"log"
	"math/big"
	"os"
	"os/signal"
	"time"

	"github.com/aqua-x402/backend/internal/queues"
	"github.com/aqua-x402/backend/internal/repositories"
	eventmonitor "github.com/aqua-x402/backend/internal/services/events"
	"github.com/aqua-x402/backend/pkg/config"
	"github.com/aqua-x402/backend/pkg/evm"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer logger.Sync()

	// Initialize ClickHouse repository
	clickhouseDSN := os.Getenv("CLICKHOUSE_DSN")
	if clickhouseDSN == "" {
		clickhouseDSN = "clickhouse://admin:CH_S3cur3_2025_Admin_PAGGA_987@host.docker.internal:9000/pagga_data"
	}
	repo, err := repositories.NewRepository(clickhouseDSN)
	if err != nil {
		logger.Warn("Failed to initialize ClickHouse repository", zap.Error(err))
		// Continue without ClickHouse - events will still be published to RabbitMQ
	}
	var rfqRepo *repositories.RFQRepository
	if repo != nil {
		rfqRepo = repositories.NewRFQRepository(repo)
	}

	// Initialize RabbitMQ
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://admin:changeme@localhost:5672/"
	}
	queue, err := queues.NewQueue(rabbitmqURL)
	if err != nil {
		logger.Fatal("Failed to initialize queue", zap.Error(err))
	}
	defer queue.Close()

	// Initialize EVM client for event monitoring
	evmRPCURL := os.Getenv("EVM_RPC_URL")
	if evmRPCURL == "" {
		evmRPCURL = "http://hardhat-node:8545"
	}

	// Wait for hardhat-node to be ready with retries
	logger.Info("Waiting for hardhat-node to be ready", zap.String("rpc_url", evmRPCURL))
	var evmClient *evm.Client
	maxRetries := 30
	retryDelay := 2 * time.Second
	for i := 0; i < maxRetries; i++ {
		var err error
		evmClient, err = evm.NewClient(evmRPCURL)
		if err == nil {
			// Test connection by getting block number
			_, err = evmClient.BlockNumber(context.Background())
			if err == nil {
				logger.Info("Hardhat-node is ready")
				break
			}
		}
		if i < maxRetries-1 {
			logger.Warn("Hardhat-node not ready yet, retrying...",
				zap.Int("attempt", i+1),
				zap.Int("max_retries", maxRetries),
				zap.Error(err))
			time.Sleep(retryDelay)
		} else {
			logger.Fatal("Failed to connect to hardhat-node after retries", zap.Error(err))
		}
	}

	// Try to load contract addresses from .env.demo file if environment variables are not set
	// This allows worker to read addresses from the file mounted in docker-compose
	envFilePath := "/app/.env.demo"
	if loaded, err := config.LoadEnvFileIfExists(envFilePath); err != nil {
		logger.Warn("Failed to load .env.demo file", zap.String("path", envFilePath), zap.Error(err))
	} else if loaded {
		logger.Info("Loaded contract addresses from .env.demo file", zap.String("path", envFilePath))
	}

	// Get contract addresses from environment (may be set via env vars or loaded from .env.demo)
	rfqAddress := os.Getenv("RFQ_CONTRACT_ADDRESS")
	if rfqAddress == "" {
		// Try VITE_RFQ_ADDRESS as fallback (from .env.demo)
		rfqAddress = os.Getenv("VITE_RFQ_ADDRESS")
	}

	auctionAddress := os.Getenv("AUCTION_CONTRACT_ADDRESS")
	if auctionAddress == "" {
		// Try VITE_AUCTION_ADDRESS as fallback (from .env.demo)
		auctionAddress = os.Getenv("VITE_AUCTION_ADDRESS")
	}

	if rfqAddress == "" || auctionAddress == "" {
		logger.Warn("Contract addresses not set, event monitoring disabled",
			zap.String("rfq_address", rfqAddress),
			zap.String("auction_address", auctionAddress))
	} else {
		// Initialize and start event monitor
		monitor, err := eventmonitor.NewMonitor(
			evmClient,
			queue,
			rfqRepo,
			rfqAddress,
			auctionAddress,
			logger,
		)
		if err != nil {
			logger.Fatal("Failed to initialize event monitor", zap.Error(err))
		}

		// Start event monitor in background
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		go func() {
			if err := monitor.Start(ctx); err != nil && err != context.Canceled {
				logger.Error("Event monitor error", zap.Error(err))
			}
		}()

		logger.Info("Event monitor started",
			zap.String("rfq_address", rfqAddress),
			zap.String("auction_address", auctionAddress))
	}

	// Consume RFQ events from RabbitMQ and save to ClickHouse
	if err := queue.Consume("rfq.events", func(body []byte) error {
		var eventData map[string]interface{}
		if err := json.Unmarshal(body, &eventData); err != nil {
			logger.Error("Failed to unmarshal RFQ event", zap.Error(err))
			return err
		}

		logger.Info("Processing RFQ event", zap.Any("event", eventData))

		// Save to ClickHouse if repository is available
		if rfqRepo != nil && eventData["type"] == "rfq_created" {
			// Extract RFQ data from event
			borrower, _ := eventData["borrower"].(string)
			amount, _ := eventData["amount"].(string)
			durationStr, _ := eventData["duration"].(string)

			// Convert duration string to uint64
			var durationUint uint64
			if durationStr != "" {
				durationBig := new(big.Int)
				if _, ok := durationBig.SetString(durationStr, 10); ok {
					durationUint = durationBig.Uint64()
				}
			}

			// Create RFQ model and save
			rfq := &repositories.RFQModel{
				BorrowerAddress: borrower,
				Amount:          amount,
				Duration:        durationUint,
				CollateralType:  0, // Default, should be fetched from contract
				FlowDescription: "ipfs://", // Default, should be fetched from contract
				Status:          "Open",
				CreatedAt:       time.Now().Unix(),
			}

			if err := rfqRepo.SaveRFQ(context.Background(), rfq); err != nil {
				logger.Error("Failed to save RFQ to ClickHouse", zap.Error(err))
				return err
			}

			rfqId, _ := eventData["rfq_id"].(string)
			logger.Info("RFQ saved to ClickHouse", zap.String("rfq_id", rfqId))
		}

		return nil
	}); err != nil {
		logger.Fatal("Failed to consume RFQ events", zap.Error(err))
	}

	// Consume Auction events from RabbitMQ
	if err := queue.Consume("auction.events", func(body []byte) error {
		var eventData map[string]interface{}
		if err := json.Unmarshal(body, &eventData); err != nil {
			logger.Error("Failed to unmarshal Auction event", zap.Error(err))
			return err
		}

		logger.Info("Processing Auction event", zap.Any("event", eventData))
		// TODO: Save to ClickHouse when AuctionRepository is implemented
		return nil
	}); err != nil {
		logger.Fatal("Failed to consume Auction events", zap.Error(err))
	}

	// Consume Quote events
	if err := queue.Consume("rfq.quotes", func(body []byte) error {
		var eventData map[string]interface{}
		if err := json.Unmarshal(body, &eventData); err != nil {
			logger.Error("Failed to unmarshal Quote event", zap.Error(err))
			return err
		}

		logger.Info("Processing Quote event", zap.Any("event", eventData))
		// TODO: Save quotes to ClickHouse
		return nil
	}); err != nil {
		logger.Fatal("Failed to consume Quote events", zap.Error(err))
	}

	// Consume Bid events
	if err := queue.Consume("auction.bids", func(body []byte) error {
		var eventData map[string]interface{}
		if err := json.Unmarshal(body, &eventData); err != nil {
			logger.Error("Failed to unmarshal Bid event", zap.Error(err))
			return err
		}

		logger.Info("Processing Bid event", zap.Any("event", eventData))
		// TODO: Save bids to ClickHouse
		return nil
	}); err != nil {
		logger.Fatal("Failed to consume Bid events", zap.Error(err))
	}

	logger.Info("Worker started")

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	logger.Info("Shutting down worker...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Graceful shutdown
	<-ctx.Done()
	logger.Info("Worker exited")
}

