#!/bin/bash

set -e

echo "=========================================="
echo "Aqua x402 Finance Layer - Demo Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Start ClickHouse cluster
start_clickhouse_cluster() {
    echo -e "${BLUE}Starting ClickHouse cluster...${NC}"
    cd "$PROJECT_ROOT/clickhouse"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Warning: .env file not found in clickhouse directory${NC}"
        echo -e "${YELLOW}Please create .env file from env.example${NC}"
    fi
    
    # Start ClickHouse cluster
    docker-compose up -d
    
    # Wait for HAProxy to be ready
    echo -e "${BLUE}Waiting for ClickHouse cluster to be ready...${NC}"
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8123/ping > /dev/null 2>&1; then
            echo -e "${GREEN}ClickHouse cluster is ready${NC}"
            cd "$PROJECT_ROOT"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    echo ""
    echo -e "${RED}ClickHouse cluster failed to start in time${NC}"
    cd "$PROJECT_ROOT"
    return 1
}

# Start main application services
start_main_services() {
    echo -e "${BLUE}Starting main application services (RabbitMQ, Backend, Frontend)...${NC}"
    cd "$PROJECT_ROOT"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Warning: .env file not found in project root${NC}"
        echo -e "${YELLOW}Using default values from docker-compose.yml${NC}"
    fi
    
    # Start main services (excluding hardhat-node, it will be started separately)
    docker-compose up -d rabbitmq backend frontend
    
    # Wait for services to be ready
    echo -e "${BLUE}Waiting for services to be ready...${NC}"
    sleep 5
    
    # Check RabbitMQ
    local max_attempts=20
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:15672 > /dev/null 2>&1; then
            echo -e "${GREEN}RabbitMQ is ready${NC}"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    # Check Backend
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo -e "${GREEN}Backend API is ready${NC}"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo -e "${GREEN}Main services started${NC}"
}

# Check if Hardhat node is running
check_hardhat_node() {
    echo -e "${BLUE}Starting Hardhat node via docker-compose...${NC}"
    cd "$PROJECT_ROOT"
    
    # Start Hardhat node service
    docker-compose up -d hardhat-node
    
    # Wait for Hardhat node to be ready
    echo -e "${BLUE}Waiting for Hardhat node to be ready...${NC}"
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8545 > /dev/null 2>&1; then
            echo -e "${GREEN}Hardhat node is ready${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    echo ""
    echo -e "${RED}Hardhat node failed to start in time${NC}"
    return 1
}

# Deploy contracts
deploy_contracts() {
    echo -e "${BLUE}Deploying contracts...${NC}"
    cd "$PROJECT_ROOT/contracts"
    
    # Compile contracts
    npm run compile
    
    # Deploy to local network
    DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.ts --network localhost 2>&1)
    echo "$DEPLOY_OUTPUT"
    
    # Extract contract addresses
    RFQ_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "RFQ deployed to:" | awk '{print $4}')
    AUCTION_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Auction deployed to:" | awk '{print $4}')
    AQUA_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "AquaIntegration deployed to:" | awk '{print $4}')
    AGENT_FINANCE_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "AgentFinance deployed to:" | awk '{print $4}')
    
    echo -e "${GREEN}Contracts deployed:${NC}"
    echo "  RFQ: $RFQ_ADDRESS"
    echo "  Auction: $AUCTION_ADDRESS"
    echo "  Aqua: $AQUA_ADDRESS"
    echo "  AgentFinance: $AGENT_FINANCE_ADDRESS"
    
    # Save addresses to .env
    cd "$PROJECT_ROOT"
    cat > .env.demo << EOF
VITE_RFQ_ADDRESS=$RFQ_ADDRESS
VITE_AUCTION_ADDRESS=$AUCTION_ADDRESS
VITE_AQUA_ADDRESS=$AQUA_ADDRESS
VITE_AGENT_FINANCE_ADDRESS=$AGENT_FINANCE_ADDRESS
VITE_API_URL=http://localhost:8080
EOF
    
    echo -e "${GREEN}Contract addresses saved to .env.demo${NC}"
}

# Run contract tests
run_contract_tests() {
    echo -e "${BLUE}Running contract tests...${NC}"
    cd "$PROJECT_ROOT/contracts"
    # Run tests one by one to avoid ts-node compilation issues
    echo "Running RFQ tests..."
    npx hardhat test test/RFQ.test.ts || echo "RFQ tests completed with some failures"
    echo "Running Auction tests..."
    npx hardhat test test/Auction.test.ts || echo "Auction tests completed with some failures"
    echo "Running AquaIntegration tests..."
    npx hardhat test test/AquaIntegration.test.ts || echo "AquaIntegration tests completed with some failures"
    echo "Running AgentFinance tests..."
    npx hardhat test test/AgentFinance.test.ts || echo "AgentFinance tests completed with some failures"
    echo "Running Integration tests..."
    npx hardhat test test/integration.test.ts || echo "Integration tests completed with some failures"
    cd "$PROJECT_ROOT"
}

# Backend is now started via docker-compose, so this function is not needed
# Keeping for backward compatibility but it won't be called
start_backend() {
    echo -e "${GREEN}Backend is managed by docker-compose${NC}"
}

# Run backend tests
run_backend_tests() {
    echo -e "${BLUE}Running backend tests...${NC}"
    cd "$PROJECT_ROOT/backend"
    go test ./test/... -v
    cd "$PROJECT_ROOT"
}

# Frontend is now started via docker-compose, so this function is not needed
# Keeping for backward compatibility but it won't be called
start_frontend() {
    echo -e "${GREEN}Frontend is managed by docker-compose${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    
    # Stop main services (including Hardhat node)
    cd "$PROJECT_ROOT"
    docker-compose down 2>/dev/null || true
    
    # Stop ClickHouse cluster
    cd "$PROJECT_ROOT/clickhouse"
    docker-compose down 2>/dev/null || true
    
    cd "$PROJECT_ROOT"
}

# Stop services
stop_services() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    cleanup
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Check for --stop argument
if [ "$1" == "--stop" ]; then
    stop_services
fi

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo -e "${BLUE}Step 1: Starting ClickHouse cluster...${NC}"
    start_clickhouse_cluster
    
    echo -e "${BLUE}Step 2: Starting main application services...${NC}"
    start_main_services
    
    echo -e "${BLUE}Step 3: Checking Hardhat node...${NC}"
    check_hardhat_node
    
    echo -e "${BLUE}Step 4: Running contract tests...${NC}"
    run_contract_tests
    
    echo -e "${BLUE}Step 5: Deploying contracts...${NC}"
    deploy_contracts
    
    echo -e "${BLUE}Step 6: Running backend tests...${NC}"
    run_backend_tests
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "Demo environment is ready!"
    echo "==========================================${NC}"
    echo ""
    echo "Infrastructure Services:"
    echo "  - ClickHouse Cluster: http://localhost:8123 (HAProxy)"
    echo "  - ClickHouse Stats: http://localhost:8404/stats"
    echo "  - RabbitMQ Management: http://localhost:15672"
    echo ""
    echo "Application Services:"
    echo "  - Hardhat Node: http://localhost:8545"
    echo "  - Backend API: http://localhost:8080"
    echo "  - Frontend: http://localhost:3000"
    echo ""
    echo "Run demo scenario:"
    echo "  ./scripts/demo-scenario.sh"
    echo ""
    echo "To stop all services:"
    echo "  ./scripts/run-demo.sh --stop"
    echo "  or press Ctrl+C"
    echo ""
    
    # Wait for user interrupt
    wait
}

# Run main
main

