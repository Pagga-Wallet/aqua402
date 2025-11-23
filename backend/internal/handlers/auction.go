package handlers

import (
	"net/http"
	"strconv"

	"github.com/Pagga-Wallet/aqua402/internal/repositories"
	"github.com/Pagga-Wallet/aqua402/internal/services/auction"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// Import for Swagger generation
var _ = repositories.AuctionModel{}

type AuctionHandler struct {
	service *auction.Service
	logger  *zap.Logger
}

func NewAuctionHandler(service *auction.Service, logger *zap.Logger) *AuctionHandler {
	return &AuctionHandler{
		service: service,
		logger:  logger,
	}
}

// CreateAuction creates a new auction
// @Summary      Create auction
// @Description  Creates a new auction for financing
// @Tags         Auction
// @Accept       json
// @Produce      json
// @Param        request  body      auction.CreateAuctionRequest  true  "Auction data"
// @Success      201      {object}  map[string]interface{}
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /auction [post]
func (h *AuctionHandler) CreateAuction(c echo.Context) error {
	var req auction.CreateAuctionRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	result, err := h.service.CreateAuction(c.Request().Context(), req)
	if err != nil {
		h.logger.Error("Failed to create auction", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, result)
}

// PlaceBid places a bid on an auction
// @Summary      Place bid
// @Description  Places a bid on a specific auction
// @Tags         Auction
// @Accept       json
// @Produce      json
// @Param        id       path      int                true  "Auction ID"
// @Param        request  body      auction.BidRequest  true  "Bid data"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /auction/{id}/bid [post]
func (h *AuctionHandler) PlaceBid(c echo.Context) error {
	var req auction.BidRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	if err := h.service.PlaceBid(c.Request().Context(), req); err != nil {
		h.logger.Error("Failed to place bid", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "success",
	})
}

// GetAuction retrieves Auction information by ID
// @Summary      Get Auction
// @Description  Returns information about a specific auction
// @Tags         Auction
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Auction ID"
// @Success      200  {object}  repositories.AuctionModel
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /auction/{id} [get]
func (h *AuctionHandler) GetAuction(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid Auction ID",
		})
	}

	result, err := h.service.GetAuction(c.Request().Context(), id)
	if err != nil {
		h.logger.Error("Failed to get auction", zap.Error(err))
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Auction not found",
		})
	}

	return c.JSON(http.StatusOK, result)
}

// ListAuctions retrieves a list of auctions
// @Summary      List Auctions
// @Description  Returns a list of all auctions with pagination
// @Tags         Auction
// @Accept       json
// @Produce      json
// @Param        limit   query     int  false  "Record limit"  default(20)
// @Param        offset  query     int  false  "Offset"       default(0)
// @Success      200     {array}   repositories.AuctionModel
// @Failure      500     {object}  map[string]string
// @Router       /auction [get]
func (h *AuctionHandler) ListAuctions(c echo.Context) error {
	limitStr := c.QueryParam("limit")
	offsetStr := c.QueryParam("offset")

	limit := 20
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	result, err := h.service.ListAuctions(c.Request().Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to list auctions", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}

// FinalizeAuction finalizes an auction
// @Summary      Finalize auction
// @Description  Finalizes an auction by selecting the best bid
// @Tags         Auction
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Auction ID"
// @Success      200  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auction/{id}/finalize [post]
func (h *AuctionHandler) FinalizeAuction(c echo.Context) error {
	_ = c.Param("id") // TODO: Parse auctionID as uint64

	if err := h.service.FinalizeAuction(c.Request().Context(), 0); err != nil {
		h.logger.Error("Failed to finalize auction", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "success",
	})
}
