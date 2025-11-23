package main

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	"go.uber.org/zap"

	"github.com/aqua-x402/backend/internal/handlers"
	"github.com/aqua-x402/backend/internal/queues"
	"github.com/aqua-x402/backend/internal/repositories"
	"github.com/aqua-x402/backend/internal/services/aqua"
	"github.com/aqua-x402/backend/internal/services/auction"
	"github.com/aqua-x402/backend/internal/services/rfq"
	"github.com/aqua-x402/backend/internal/websocket"
)

func SetupApp() *echo.Echo {
	logger, _ := zap.NewDevelopment()

	// Initialize Echo
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Initialize services (with mocks for testing)
	repo, _ := repositories.NewRepository("clickhouse://test:test@localhost:8123/test")
	rfqRepo := repositories.NewRFQRepository(repo)

	queue, _ := queues.NewQueue("amqp://guest:guest@localhost:5672/")

	rfqService := rfq.NewService(rfqRepo, queue, logger)
	auctionService := auction.NewService(queue, logger)
	aquaService := aqua.NewService(queue, logger)

	// Initialize handlers
	rfqHandler := handlers.NewRFQHandler(rfqService, logger)
	auctionHandler := handlers.NewAuctionHandler(auctionService, logger)
	aquaHandler := handlers.NewAquaHandler(aquaService, logger)

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

	// Swagger documentation - displayed at /api/v1/
	api.GET("", echoSwagger.WrapHandler)
	api.GET("/", echoSwagger.WrapHandler)

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

	// WebSocket routes
	e.GET("/ws", wsHandler.HandleWebSocket)
	e.GET("/ws/rfq/:id", wsHandler.HandleRFQWebSocket)
	e.GET("/ws/auction/:id", wsHandler.HandleAuctionWebSocket)

	return e
}
