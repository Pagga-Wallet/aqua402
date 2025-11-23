# Aqua x402 Finance Layer

Agent financing layer on top of the 402 protocol (x402/A2A) with two matching modes: RFQ (Request for Quote) and auctions. Integration with 1inch Aqua for shared liquidity.

## Quick Start

### Requirements

-   Node.js 20+
-   Go 1.21+
-   Docker and Docker Compose
-   Hardhat

### Installation

1. Clone the repository and navigate to the directory:

```bash
cd aqua_x402
```

2. Install all dependencies:

```bash
./scripts/setup-test-env.sh
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit the .env file
```

## Testing

### Quick run all tests

```bash
./scripts/test-all.sh
```

### Full demonstration

Start local blockchain and all services:

```bash
./scripts/run-demo.sh
```

This script starts:
- Hardhat node (local blockchain on port 8545)
- Deployment of all contracts
- Backend API (port 8080)
- Frontend (port 3000)

After starting the demo, run the demonstration scenario:

```bash
./scripts/demo-scenario.sh
```

This will test full flows for RFQ and Auction through the API.

### Individual tests

**Contracts:**

```bash
cd contracts
npm run test              # All tests
npm run test:integration  # Integration tests only
```

**Backend:**

```bash
cd backend
go test ./test/... -v
```

**Frontend E2E:**

```bash
cd frontend
npm run test:e2e
```

## Running locally

### Quick start (all services)

```bash
./scripts/start-dev.sh
```

### Or individually:

**Contracts:**

```bash
cd contracts
npm run compile
npm run test
npm run node  # Start local Hardhat node
```

**Backend:**

```bash
cd backend
go mod download
go run cmd/api/main.go
```

**Frontend:**

```bash
cd frontend
npm run dev
```

**Worker (queue processing):**

```bash
cd backend
go run cmd/worker/main.go
```

### Running via Docker

```bash
docker-compose up -d
```

Services will be available at:

-   Frontend: http://localhost:3000
-   Backend API: http://localhost:8080
-   ClickHouse: http://localhost:8123
-   RabbitMQ Management: http://localhost:15672
-   Hardhat Node: http://localhost:8545

**Note:** Hardhat node is now managed via docker-compose. To start/stop it separately:

```bash
# Start Hardhat node
docker-compose up -d hardhat-node

# Stop Hardhat node
docker-compose stop hardhat-node

# View Hardhat node logs
docker-compose logs -f hardhat-node
```

## Project Structure

```
aqua_x402/
├── contracts/          # Solidity contracts (Hardhat)
├── frontend/           # React + Vite + wagmi + MobX
├── backend/            # Go Echo + BUN + RabbitMQ
├── clickhouse/          # ClickHouse cluster
├── docs/               # Documentation
└── scripts/             # Setup and deployment scripts
```

## Documentation

-   [Architecture](docs/architecture.md)
-   [API](docs/api.md)
-   [Deployment](docs/deployment.md)

## Development

### Contracts

Contracts are located in `contracts/`:

-   `rfq/RFQ.sol` - RFQ contract
-   `auction/Auction.sol` - Auction contract
-   `aqua/AquaIntegration.sol` - Aqua integration
-   `finance/AgentFinance.sol` - Finance layer wrapper

### Backend

Backend uses:

-   Go Echo for REST API
-   BUN for ClickHouse operations
-   RabbitMQ for queues
-   ethers.js via Go bindings for EVM

### Frontend

Frontend uses:

-   React + Vite + TypeScript
-   wagmi for wallet connections
-   MobX for state management
-   React Query for data

## Deployment

### Contracts on testnet

```bash
cd contracts
npm run deploy -- --network sepolia
# or
npm run deploy -- --network mumbai
```

### Backend and Frontend

Use Docker Compose for production deployment or configure a CI/CD pipeline.

## License

MIT
