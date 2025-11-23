package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/aqua-x402/backend/internal/queues"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer logger.Sync()

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

	// Consume RFQ events
	if err := queue.Consume("rfq.events", func(body []byte) error {
		logger.Info("Processing RFQ event", zap.ByteString("body", body))
		// TODO: Process RFQ event
		return nil
	}); err != nil {
		logger.Fatal("Failed to consume RFQ events", zap.Error(err))
	}

	// Consume Auction events
	if err := queue.Consume("auction.events", func(body []byte) error {
		logger.Info("Processing Auction event", zap.ByteString("body", body))
		// TODO: Process Auction event
		return nil
	}); err != nil {
		logger.Fatal("Failed to consume Auction events", zap.Error(err))
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

