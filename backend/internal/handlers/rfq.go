package handlers

import (
	"net/http"
	"strconv"

	"github.com/Pagga-Wallet/aqua402/internal/repositories"
	"github.com/Pagga-Wallet/aqua402/internal/services/rfq"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// Ensure repositories package is imported for Swagger documentation
var _ = repositories.RFQModel{}

type RFQHandler struct {
	service *rfq.Service
	logger  *zap.Logger
}

func NewRFQHandler(service *rfq.Service, logger *zap.Logger) *RFQHandler {
	return &RFQHandler{
		service: service,
		logger:  logger,
	}
}

// CreateRFQ creates a new RFQ request
// @Summary      Create RFQ
// @Description  Creates a new Request for Quote
// @Tags         RFQ
// @Accept       json
// @Produce      json
// @Param        request  body      rfq.CreateRFQRequest  true  "RFQ data"
// @Success      201      {object}  repositories.RFQModel
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /rfq [post]
func (h *RFQHandler) CreateRFQ(c echo.Context) error {
	var req rfq.CreateRFQRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	result, err := h.service.CreateRFQ(c.Request().Context(), req)
	if err != nil {
		h.logger.Error("Failed to create RFQ", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, result)
}

// GetRFQ retrieves RFQ information by ID
// @Summary      Get RFQ
// @Description  Returns information about a specific RFQ request
// @Tags         RFQ
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "RFQ ID"
// @Success      200  {object}  repositories.RFQModel
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /rfq/{id} [get]
func (h *RFQHandler) GetRFQ(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid RFQ ID",
		})
	}

	result, err := h.service.GetRFQ(c.Request().Context(), id)
	if err != nil {
		h.logger.Error("Failed to get RFQ", zap.Error(err))
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "RFQ not found",
		})
	}

	return c.JSON(http.StatusOK, result)
}

// ListRFQs retrieves a list of RFQ requests
// @Summary      List RFQs
// @Description  Returns a list of all RFQ requests with pagination
// @Tags         RFQ
// @Accept       json
// @Produce      json
// @Param        limit   query     int  false  "Record limit"  default(20)
// @Param        offset  query     int  false  "Offset"       default(0)
// @Success      200     {array}   repositories.RFQModel
// @Failure      500     {object}  map[string]string
// @Router       /rfq [get]
func (h *RFQHandler) ListRFQs(c echo.Context) error {
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

	result, err := h.service.ListRFQs(c.Request().Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to list RFQs", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}

// SubmitQuote submits a quote for RFQ
// @Summary      Submit quote
// @Description  Submits a quote for a specific RFQ
// @Tags         RFQ
// @Accept       json
// @Produce      json
// @Param        id       path      int              true  "RFQ ID"
// @Param        request  body      rfq.QuoteRequest  true  "Quote data"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /rfq/{id}/quote [post]
func (h *RFQHandler) SubmitQuote(c echo.Context) error {
	var req rfq.QuoteRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	if err := h.service.SubmitQuote(c.Request().Context(), req); err != nil {
		h.logger.Error("Failed to submit quote", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "success",
	})
}
