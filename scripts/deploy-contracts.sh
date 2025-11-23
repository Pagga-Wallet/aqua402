#!/bin/bash

set -e

echo "Deploying contracts..."

cd contracts

# Check if network is provided
NETWORK=${1:-localhost}

if [ "$NETWORK" = "localhost" ]; then
    echo "Starting local Hardhat node..."
    npx hardhat node &
    HARDHAT_PID=$!
    sleep 5
fi

echo "Deploying to $NETWORK..."

# Deploy contracts
npx hardhat run scripts/deploy.ts --network $NETWORK

if [ "$NETWORK" = "localhost" ]; then
    echo "Hardhat node is running in background (PID: $HARDHAT_PID)"
    echo "To stop it, run: kill $HARDHAT_PID"
fi

echo "Deployment complete!"

