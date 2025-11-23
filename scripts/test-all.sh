#!/bin/bash

set -e

echo "=========================================="
echo "Running All Tests"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Test contracts
echo -e "${BLUE}Testing contracts...${NC}"
cd contracts
npm run test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contract tests passed${NC}"
else
    echo -e "${RED}✗ Contract tests failed${NC}"
    exit 1
fi
cd ..

# Test backend
echo -e "${BLUE}Testing backend...${NC}"
cd backend
go test ./test/... -v
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
else
    echo -e "${RED}✗ Backend tests failed${NC}"
    exit 1
fi
cd ..

echo ""
echo -e "${GREEN}=========================================="
echo "All tests passed!"
echo "==========================================${NC}"

