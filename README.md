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

**Prerequisites:**
1. Start ClickHouse cluster: `cd clickhouse && docker-compose up -d`
2. Start nginx-proxy (shared web): `cd nginx-proxy && docker-compose up -d`

**Start main services:**
```bash
docker-compose up -d
```

**Production URLs (after SSL certificate is issued):**
-   Frontend: https://aquax402.pagga.io/
-   API Documentation: https://aquax402.pagga.io/api/v1
-   Backend API: https://aquax402.pagga.io/api/v1/*

**Local development URLs:**
-   ClickHouse: http://localhost:8123
-   RabbitMQ Management: http://localhost:15672
-   Hardhat Node: http://localhost:8545
-   Hardhat Node RPC (via proxy): https://aquax402.pagga.io/api/hh

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

## Local Hardhat Network Testing

The application supports testing on a local Hardhat network (chainId 1337). This allows you to test smart contracts and interactions without using real testnet tokens.

### Connecting to Local Network

1. **In MetaMask or your wallet:**
   - Add a custom network with the following settings:
     - Network Name: `Hardhat Local`
     - RPC URL: `https://aquax402.pagga.io/api/hh`
     - Chain ID: `1337`
     - Currency Symbol: `ETH`

2. **The frontend will automatically detect the local network** when you connect your wallet and show the faucet component.

### Getting Test Tokens

The application includes a built-in faucet for the local Hardhat network:

1. Connect your wallet to the Hardhat Local network (chainId 1337)
2. Click the "Get 1 ETH" button in the faucet component (visible in the header when on the local network)
3. The faucet will send 1 ETH to your connected wallet address
4. You can request tokens multiple times as needed for testing

### Faucet Configuration

The faucet uses the first Hardhat account (account #0) by default. To use a different account, set the `FAUCET_PRIVATE_KEY` environment variable in the backend:

```bash
FAUCET_PRIVATE_KEY=0x...your_private_key_here
```

You can also configure the chain ID if needed:

```bash
FAUCET_CHAIN_ID=1337
```

**Note:** The faucet only works on the local Hardhat network (chainId 1337) for security reasons.

## License

MIT
