package handlers

import (
	"net/http"

	"github.com/Pagga-Wallet/aqua402/internal/services/aqua"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

type AquaHandler struct {
	service *aqua.Service
	logger  *zap.Logger
}

func NewAquaHandler(service *aqua.Service, logger *zap.Logger) *AquaHandler {
	return &AquaHandler{
		service: service,
		logger:  logger,
	}
}

// ConnectLiquidity connects liquidity through Aqua
// @Summary      Connect liquidity
// @Description  Connects lender liquidity through 1inch Aqua
// @Tags         Aqua
// @Accept       json
// @Produce      json
// @Param        request  body      aqua.ConnectLiquidityRequest  true  "Liquidity data"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /aqua/liquidity [post]
func (h *AquaHandler) ConnectLiquidity(c echo.Context) error {
	var req aqua.ConnectLiquidityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	if err := h.service.ConnectLiquidity(c.Request().Context(), req); err != nil {
		h.logger.Error("Failed to connect liquidity", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "success",
	})
}

// WithdrawLiquidity withdraws liquidity
// @Summary      Withdraw liquidity
// @Description  Withdraws liquidity from Aqua
// @Tags         Aqua
// @Accept       json
// @Produce      json
// @Param        request  body      aqua.WithdrawLiquidityRequest  true  "Withdrawal data"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /aqua/withdraw [post]
func (h *AquaHandler) WithdrawLiquidity(c echo.Context) error {
	var req aqua.WithdrawLiquidityRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	if err := h.service.WithdrawLiquidity(c.Request().Context(), req); err != nil {
		h.logger.Error("Failed to withdraw liquidity", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "success",
	})
}

// GetAvailableLiquidity retrieves available liquidity
// @Summary      Get liquidity
// @Description  Returns available liquidity for a lender
// @Tags         Aqua
// @Accept       json
// @Produce      json
// @Param        address  path      string  true  "Lender address"
// @Success      200      {object}  map[string]interface{}
// @Failure      500      {object}  map[string]string
// @Router       /aqua/liquidity/{address} [get]
func (h *AquaHandler) GetAvailableLiquidity(c echo.Context) error {
	address := c.Param("address")

	result, err := h.service.GetAvailableLiquidity(c.Request().Context(), address)
	if err != nil {
		h.logger.Error("Failed to get liquidity", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}
