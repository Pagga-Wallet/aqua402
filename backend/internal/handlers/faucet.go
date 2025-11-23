package handlers

import (
	"net/http"

	"github.com/Pagga-Wallet/aqua402/internal/services/faucet"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

type FaucetHandler struct {
	service *faucet.Service
	logger  *zap.Logger
}

func NewFaucetHandler(service *faucet.Service, logger *zap.Logger) *FaucetHandler {
	return &FaucetHandler{
		service: service,
		logger:  logger,
	}
}

// RequestTokens requests test tokens from the faucet
// @Summary      Request test tokens
// @Description  Requests test ETH tokens from the faucet for the specified address
// @Tags         Faucet
// @Accept       json
// @Produce      json
// @Param        request  body      faucet.RequestTokensRequest  true  "Faucet request"
// @Success      200      {object} map[string]string
// @Failure      400      {object} map[string]string
// @Failure      500      {object} map[string]string
// @Router       /faucet [post]
func (h *FaucetHandler) RequestTokens(c echo.Context) error {
	var req faucet.RequestTokensRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request",
		})
	}

	// Default amount if not specified
	if req.Amount == "" {
		req.Amount = "1.0" // Default 1 ETH
	}

	txHash, err := h.service.RequestTokens(c.Request().Context(), req)
	if err != nil {
		h.logger.Error("Failed to request tokens", zap.Error(err))
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status":  "success",
		"tx_hash": txHash,
		"address": req.Address,
		"amount":  req.Amount,
	})
}
