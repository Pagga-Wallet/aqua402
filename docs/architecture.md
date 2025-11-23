# Aqua x402 Finance Layer Architecture

## Overview

The system consists of the following components:

1. **Smart Contracts (EVM)** - Solidity contracts on Hardhat
2. **Backend (Go Echo)** - REST API and services
3. **Frontend (React + Vite)** - User interface
4. **ClickHouse Cluster** - Analytical database
5. **RabbitMQ** - Message queues

## Components

### Smart Contracts

- **RFQ.sol** - Contract for quote requests
- **Auction.sol** - Contract for auctions
- **AquaIntegration.sol** - Integration with 1inch Aqua
- **AgentFinance.sol** - Wrapper connecting RFQ/Auction with x402

### Backend Services

- **RFQ Service** - RFQ request management
- **Auction Service** - Auction management
- **Aqua Service** - Integration with Aqua SDK
- **x402 Integration Service** - Connection with x402 protocol

### Frontend Features

- **Borrower Dashboard** - Interface for borrowers
- **Lender Dashboard** - Interface for lenders
- **Auction Live View** - Auction visualization
- **Agent Profile** - Agent profile

## Data Flows

### RFQ Flow

1. Borrower creates RFQ through contract
2. Lenders submit proposals (quotes)
3. Borrower selects the best proposal
4. Credit line is created through x402
5. Liquidity is reserved from Aqua

### Auction Flow

1. Borrower creates auction
2. Lenders place bids
3. Best bid is selected at the end
4. Credit line is created through x402
5. Liquidity is reserved from Aqua

## Integrations

- **1inch Aqua** - Shared liquidity pool
- **x402 Protocol** - Credit lines and payments
- **EVM Networks** - Sepolia, Mumbai (Polygon)
