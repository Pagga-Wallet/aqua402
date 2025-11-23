# Testing Guide

## Overview

The project includes a complete test suite:
- Unit tests for contracts
- Integration tests for contracts
- Backend API tests
- E2E tests for frontend

## Contracts

### Run all tests

```bash
cd contracts
npm run test
```

### Run individual tests

```bash
# RFQ tests
npx hardhat test test/RFQ.test.ts

# Auction tests
npx hardhat test test/Auction.test.ts

# Aqua Integration tests
npx hardhat test test/AquaIntegration.test.ts

# AgentFinance integration tests
npx hardhat test test/AgentFinance.test.ts

# Full integration tests
npx hardhat test test/integration.test.ts
```

### Coverage

```bash
npx hardhat coverage
```

## Backend

### Unit tests

```bash
cd backend
go test ./... -v
```

### Integration tests

```bash
cd backend
go test ./test/... -v
```

Tests use httptest to create a test server without a real database.

## Frontend

### Unit tests (if configured)

```bash
cd frontend
npm run test
```

### E2E tests

Requires Playwright:

```bash
cd frontend
npx playwright install
npm run test:e2e
```

## Full test run

Run all tests with one command:

```bash
./scripts/test-all.sh
```

## Demonstration

Run full demonstration with local blockchain:

```bash
./scripts/run-demo.sh
```

This script:
1. Starts Hardhat node
2. Deploys contracts
3. Starts backend
4. Starts frontend
5. Shows all addresses

## Test Scenarios

### RFQ Flow

1. Borrower creates RFQ
2. Lender submits proposal
3. Borrower accepts proposal
4. Credit line is created through x402
5. Liquidity is reserved from Aqua

### Auction Flow

1. Borrower creates auction
2. Multiple lenders place bids
3. Auction is finalized (best bid selected)
4. Credit line is created
5. Liquidity is reserved from Aqua

## Debugging

### Hardhat Console

```bash
cd contracts
npx hardhat console --network localhost
```

### Backend Logs

```bash
tail -f /tmp/backend.log
```

### Frontend Logs

```bash
tail -f /tmp/frontend.log
```

### Hardhat Node Logs

```bash
tail -f /tmp/hardhat-node.log
```
