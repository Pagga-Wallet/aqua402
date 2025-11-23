# API Documentation

## Backend API

### Health Check

```
GET /health
```

Returns service status.

### RFQ Endpoints

```
POST /api/v1/rfq
GET /api/v1/rfq/:id
GET /api/v1/rfq/:id/quotes
POST /api/v1/rfq/:id/quote
POST /api/v1/rfq/:id/accept
POST /api/v1/rfq/:id/execute
```

### Auction Endpoints

```
POST /api/v1/auction
GET /api/v1/auction/:id
GET /api/v1/auction/:id/bids
POST /api/v1/auction/:id/bid
POST /api/v1/auction/:id/finalize
POST /api/v1/auction/:id/settle
```

### Aqua Endpoints

```
POST /api/v1/aqua/liquidity
GET /api/v1/aqua/liquidity/:address
POST /api/v1/aqua/withdraw
```

## WebSocket

### RFQ Updates

```
ws://localhost:8080/ws/rfq/:id
```

Sends real-time RFQ updates.

### Auction Updates

```
ws://localhost:8080/ws/auction/:id
```

Sends real-time auction updates.
