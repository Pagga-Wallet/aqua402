# Deployment Guide

## Local Deployment

### 1. Install Dependencies

```bash
./scripts/setup.sh
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
CLICKHOUSE_PASSWORD=changeme
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=changeme
EVM_RPC_URL=http://localhost:8545
WALLETCONNECT_PROJECT_ID=your_project_id
```

### 3. Start via Docker Compose

```bash
docker-compose up -d
```

### 4. Run ClickHouse Migrations

```bash
cd clickhouse
docker-compose exec migrator clickhouse-migrator up
```

## Testnet Deployment

### Contracts

1. Configure `.env` in `contracts/`:
```env
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_api_key
```

2. Deploy:
```bash
cd contracts
npm run deploy -- --network sepolia
```

### Backend

1. Configure environment variables for production
2. Build Docker image:
```bash
cd backend
docker build -t aqua-x402-backend .
```

3. Run:
```bash
docker run -d -p 8080:8080 \
  -e CLICKHOUSE_DSN=your_clickhouse_dsn \
  -e RABBITMQ_URL=your_rabbitmq_url \
  aqua-x402-backend
```

### Frontend

1. Build production build:
```bash
cd frontend
npm run build
```


