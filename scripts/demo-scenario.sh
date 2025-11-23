#!/bin/bash

set -e

echo "=========================================="
echo "Demo Scenario: Full RFQ and Auction Flow"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="https://aquax402.pagga.io/api/v1"

# Wait for API to be ready
wait_for_api() {
    echo -e "${YELLOW}Waiting for API to be ready...${NC}"
    for i in {1..30}; do
        if curl -k -s "$API_URL/health" > /dev/null 2>&1; then
            echo -e "${GREEN}API is ready!${NC}"
            return 0
        fi
        sleep 1
    done
    echo -e "${YELLOW}API not ready, continuing anyway...${NC}"
}

# Demo RFQ Flow
demo_rfq() {
    echo -e "${BLUE}=== RFQ Flow Demo ===${NC}"
    
    # 1. Create RFQ
    echo "1. Creating RFQ..."
    RFQ_RESPONSE=$(curl -k -s -X POST "$API_URL/rfq" \
        -H "Content-Type: application/json" \
        -d '{
            "borrower_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "amount": "1000",
            "duration": 2592000,
            "collateral_type": 1,
            "flow_description": "ipfs://demo-rfq"
        }')
    
    echo "RFQ Created: $RFQ_RESPONSE"
    
    # 2. Submit Quote
    echo "2. Submitting quote..."
    QUOTE_RESPONSE=$(curl -k -s -X POST "$API_URL/rfq/0/quote" \
        -H "Content-Type: application/json" \
        -d '{
            "rfq_id": 0,
            "lender_address": "0x8ba1f109551bD432803012645Hac136c22C177",
            "rate_bps": 500,
            "limit": "1000",
            "collateral_required": "200"
        }')
    
    echo "Quote Submitted: $QUOTE_RESPONSE"
    
    # 3. Get RFQ
    echo "3. Getting RFQ details..."
    RFQ_DETAILS=$(curl -k -s "$API_URL/rfq/0")
    echo "RFQ Details: $RFQ_DETAILS"
    
    echo -e "${GREEN}RFQ Flow completed!${NC}"
    echo ""
}

# Demo Auction Flow
demo_auction() {
    echo -e "${BLUE}=== Auction Flow Demo ===${NC}"
    
    # 1. Create Auction
    echo "1. Creating auction..."
    AUCTION_RESPONSE=$(curl -k -s -X POST "$API_URL/auction" \
        -H "Content-Type: application/json" \
        -d '{
            "borrower_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "amount": "2000",
            "duration": 2592000,
            "bidding_duration": 3600
        }')
    
    echo "Auction Created: $AUCTION_RESPONSE"
    
    # 2. Place Bid 1
    echo "2. Placing first bid..."
    BID1_RESPONSE=$(curl -k -s -X POST "$API_URL/auction/0/bid" \
        -H "Content-Type: application/json" \
        -d '{
            "auction_id": 0,
            "lender_address": "0x8ba1f109551bD432803012645Hac136c22C177",
            "rate_bps": 600,
            "limit": "2000"
        }')
    
    echo "Bid 1 Placed: $BID1_RESPONSE"
    
    # 3. Place Bid 2
    echo "3. Placing second bid..."
    BID2_RESPONSE=$(curl -k -s -X POST "$API_URL/auction/0/bid" \
        -H "Content-Type: application/json" \
        -d '{
            "auction_id": 0,
            "lender_address": "0x1234567890123456789012345678901234567890",
            "rate_bps": 500,
            "limit": "2000"
        }')
    
    echo "Bid 2 Placed: $BID2_RESPONSE"
    
    # 4. Finalize Auction
    echo "4. Finalizing auction..."
    FINALIZE_RESPONSE=$(curl -k -s -X POST "$API_URL/auction/0/finalize" \
        -H "Content-Type: application/json")
    
    echo "Auction Finalized: $FINALIZE_RESPONSE"
    
    echo -e "${GREEN}Auction Flow completed!${NC}"
    echo ""
}

# Main
main() {
    wait_for_api
    
    demo_rfq
    demo_auction
    
    echo -e "${GREEN}=========================================="
    echo "Demo scenario completed!"
    echo "==========================================${NC}"
    echo ""
    echo "Check the frontend at https://aquax402.pagga.io"
    echo "Check the API docs at https://aquax402.pagga.io/api/v1"
    echo "Check the backend logs for more details"
}

main

