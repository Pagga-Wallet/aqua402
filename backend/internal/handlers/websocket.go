package handlers

import (
	"net/http"

	wsHub "github.com/Pagga-Wallet/aqua402/internal/websocket"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

type WebSocketHandler struct {
	hub *wsHub.Hub
}

func NewWebSocketHandler(hub *wsHub.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: hub}
}

func (h *WebSocketHandler) HandleWebSocket(c echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := wsHub.NewClient(h.hub, conn)
	h.hub.Register(client)

	go client.WritePump()
	client.ReadPump()

	return nil
}

func (h *WebSocketHandler) HandleRFQWebSocket(c echo.Context) error {
	rfqID := c.Param("id")
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := wsHub.NewClient(h.hub, conn)
	client.Subscribe("rfq:" + rfqID)
	h.hub.Register(client)

	go client.WritePump()
	client.ReadPump()

	return nil
}

func (h *WebSocketHandler) HandleAuctionWebSocket(c echo.Context) error {
	auctionID := c.Param("id")
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	client := wsHub.NewClient(h.hub, conn)
	client.Subscribe("auction:" + auctionID)
	h.hub.Register(client)

	go client.WritePump()
	client.ReadPump()

	return nil
}

