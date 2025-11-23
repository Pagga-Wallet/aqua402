package main

import (
	"os"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	"go.uber.org/zap"

	"github.com/aqua-x402/backend/internal/handlers"
	"github.com/aqua-x402/backend/internal/queues"
	"github.com/aqua-x402/backend/internal/repositories"
	"github.com/aqua-x402/backend/internal/services/aqua"
	"github.com/aqua-x402/backend/internal/services/auction"
	"github.com/aqua-x402/backend/internal/services/faucet"
	"github.com/aqua-x402/backend/internal/services/rfq"
	"github.com/aqua-x402/backend/internal/websocket"
	"github.com/aqua-x402/backend/pkg/evm"
)

func SetupApp() *echo.Echo {
	logger, _ := zap.NewDevelopment()

	// Initialize Echo
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Initialize ClickHouse repository
	clickhouseDSN := os.Getenv("CLICKHOUSE_DSN")
	if clickhouseDSN == "" {
		clickhouseDSN = "clickhouse://admin:CH_S3cur3_2025_Admin_PAGGA_987@host.docker.internal:9000/pagga_data"
	}
	repo, err := repositories.NewRepository(clickhouseDSN)
	if err != nil {
		logger.Warn("Failed to initialize ClickHouse repository", zap.Error(err))
		// Continue with nil repo - handlers should handle this gracefully
	}
	var rfqRepo *repositories.RFQRepository
	if repo != nil {
		rfqRepo = repositories.NewRFQRepository(repo)
	}

	// Initialize RabbitMQ queue
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://admin:changeme@rabbitmq:5672/"
	}
	queue, err := queues.NewQueue(rabbitmqURL)
	if err != nil {
		logger.Warn("Failed to initialize RabbitMQ queue", zap.Error(err))
		// Continue with nil queue - handlers should handle this gracefully
	}

	rfqService := rfq.NewService(rfqRepo, queue, logger)
	auctionService := auction.NewService(queue, logger)
	aquaService := aqua.NewService(queue, logger)

	// Initialize EVM client for faucet
	evmRPCURL := os.Getenv("EVM_RPC_URL")
	if evmRPCURL == "" {
		evmRPCURL = "http://hardhat-node:8545"
	}
	evmClient, err := evm.NewClient(evmRPCURL)
	if err != nil {
		logger.Warn("Failed to initialize EVM client for faucet", zap.Error(err))
	}
	var faucetService *faucet.Service
	if evmClient != nil {
		faucetService, err = faucet.NewService(evmClient, logger)
		if err != nil {
			logger.Warn("Failed to initialize faucet service", zap.Error(err))
		}
	}

	// Initialize handlers
	rfqHandler := handlers.NewRFQHandler(rfqService, logger)
	auctionHandler := handlers.NewAuctionHandler(auctionService, logger)
	aquaHandler := handlers.NewAquaHandler(aquaService, logger)
	var faucetHandler *handlers.FaucetHandler
	if faucetService != nil {
		faucetHandler = handlers.NewFaucetHandler(faucetService, logger)
	}

	// Initialize WebSocket hub
	wsHub := websocket.NewHub()
	go wsHub.Run()
	wsHandler := handlers.NewWebSocketHandler(wsHub)

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	// API routes
	api := e.Group("/api/v1")

	// Health check in API group
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	// Swagger documentation - displayed at /api/v1/
	// echo-swagger serves UI at /swagger/index.html
	api.GET("/swagger/*", echoSwagger.WrapHandler)
	api.GET("", func(c echo.Context) error {
		// Use absolute URL to avoid port issues
		scheme := "https"
		if c.Request().Header.Get("X-Forwarded-Proto") == "http" {
			scheme = "http"
		}
		// Use X-Forwarded-Host if available, otherwise use Host
		host := c.Request().Header.Get("X-Forwarded-Host")
		if host == "" {
			host = c.Request().Host
		}
		// Remove port from host if present
		if idx := strings.Index(host, ":"); idx != -1 {
			host = host[:idx]
		}
		return c.Redirect(301, scheme+"://"+host+"/api/v1/swagger/index.html")
	})
	api.GET("/", func(c echo.Context) error {
		// Use absolute URL to avoid port issues
		scheme := "https"
		if c.Request().Header.Get("X-Forwarded-Proto") == "http" {
			scheme = "http"
		}
		// Use X-Forwarded-Host if available, otherwise use Host
		host := c.Request().Header.Get("X-Forwarded-Host")
		if host == "" {
			host = c.Request().Host
		}
		// Remove port from host if present
		if idx := strings.Index(host, ":"); idx != -1 {
			host = host[:idx]
		}
		return c.Redirect(301, scheme+"://"+host+"/api/v1/swagger/index.html")
	})

	api.POST("/rfq", rfqHandler.CreateRFQ)
	api.GET("/rfq", rfqHandler.ListRFQs)
	api.GET("/rfq/:id", rfqHandler.GetRFQ)
	api.POST("/rfq/:id/quote", rfqHandler.SubmitQuote)

	api.POST("/auction", auctionHandler.CreateAuction)
	api.POST("/auction/:id/bid", auctionHandler.PlaceBid)
	api.POST("/auction/:id/finalize", auctionHandler.FinalizeAuction)

	api.POST("/aqua/liquidity", aquaHandler.ConnectLiquidity)
	api.GET("/aqua/liquidity/:address", aquaHandler.GetAvailableLiquidity)
	api.POST("/aqua/withdraw", aquaHandler.WithdrawLiquidity)

	// Faucet endpoint
	if faucetHandler != nil {
		api.POST("/faucet", faucetHandler.RequestTokens)
	}

	// WebSocket routes
	e.GET("/ws", wsHandler.HandleWebSocket)
	e.GET("/ws/rfq/:id", wsHandler.HandleRFQWebSocket)
	e.GET("/ws/auction/:id", wsHandler.HandleAuctionWebSocket)

	return e
}
