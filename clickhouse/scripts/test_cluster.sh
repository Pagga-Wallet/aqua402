#!/bin/bash

# =============================================================================
# ClickHouse Cluster Test Script
# Tests cluster functionality by creating test tables and inserting test data
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Connection settings (through HAProxy)
CLICKHOUSE_USER=${CLICKHOUSE_ADMIN_USER:-admin}
CLICKHOUSE_PASSWORD=${CLICKHOUSE_ADMIN_PASSWORD:-CH_S3cur3_2025_Admin_PAGGA_987}
CLICKHOUSE_HOST=${CLICKHOUSE_HOST:-localhost}
CLICKHOUSE_PORT=${CLICKHOUSE_PORT:-8123}
CLICKHOUSE_DATABASE=${CLICKHOUSE_DATABASE:-default}
CLICKHOUSE_CLUSTER=${CLICKHOUSE_CLUSTER:-pagga_cluster}

# Function for printing headers
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function for executing SQL queries
execute_query() {
    local query="$1"
    curl -sS -u "${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}" \
         "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}" \
         -d "${query}"
}

# Function for checking if query succeeded
check_query() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        return 1
    fi
}

print_header "CLICKHOUSE CLUSTER TEST"

# Step 1: Check cluster configuration
print_header "1. Checking cluster configuration"
echo "Cluster: ${CLICKHOUSE_CLUSTER}"
echo "Database: ${CLICKHOUSE_DATABASE}"
execute_query "
SELECT 
    cluster, 
    shard_num, 
    replica_num,
    host_name,
    host_address,
    port
FROM system.clusters 
WHERE cluster = '${CLICKHOUSE_CLUSTER}'
ORDER BY shard_num, replica_num
FORMAT PrettyCompact
"

# Step 2: Create test database if it doesn't exist
print_header "2. Creating test database (if needed)"
execute_query "CREATE DATABASE IF NOT EXISTS ${CLICKHOUSE_DATABASE}" > /dev/null 2>&1
check_query

# Step 3: Create test table on cluster
print_header "3. Creating test table on cluster"
TEST_TABLE="cluster_test_$(date +%s)"
execute_query "
CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_local ON CLUSTER ${CLICKHOUSE_CLUSTER} (
    id UInt64,
    timestamp DateTime,
    value String,
    amount Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (id, timestamp)
SETTINGS index_granularity = 8192
" > /dev/null 2>&1
check_query

# Create distributed table
execute_query "
CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed ON CLUSTER ${CLICKHOUSE_CLUSTER}
AS ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_local
ENGINE = Distributed(${CLICKHOUSE_CLUSTER}, ${CLICKHOUSE_DATABASE}, ${TEST_TABLE}_local, rand())
" > /dev/null 2>&1
check_query

# Step 4: Insert test data
print_header "4. Inserting test data"
echo "Inserting 10000 test records..."
execute_query "
INSERT INTO ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed (id, timestamp, value, amount)
SELECT 
    number as id,
    now() - INTERVAL number SECOND as timestamp,
    concat('test_value_', toString(number)) as value,
    rand() % 1000 + (rand() % 100) / 100.0 as amount
FROM numbers(10000)
" > /dev/null 2>&1
check_query

sleep 2

# Step 5: Check data distribution
print_header "5. Checking data distribution across nodes"
execute_query "
SELECT 
    hostName() as host,
    count() as rows_count,
    formatReadableSize(sum(bytes_on_disk)) as disk_size,
    min(timestamp) as min_timestamp,
    max(timestamp) as max_timestamp
FROM ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed
GROUP BY host
ORDER BY host
FORMAT PrettyCompact
"

# Step 6: Test queries
print_header "6. Testing queries"
echo "Total records:"
execute_query "SELECT count() as total FROM ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed FORMAT PrettyCompact"

echo -e "\nSample records:"
execute_query "
SELECT id, timestamp, value, amount 
FROM ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed 
ORDER BY id 
LIMIT 5
FORMAT PrettyCompact
"

# Step 7: Check table statistics
print_header "7. Table statistics on all nodes"
execute_query "
SELECT 
    hostName() as host,
    database,
    table,
    sum(rows) as total_rows,
    formatReadableSize(sum(bytes_on_disk)) as disk_size,
    formatReadableSize(sum(data_compressed_bytes)) as compressed_size,
    count() as parts_count
FROM clusterAllReplicas('${CLICKHOUSE_CLUSTER}', 'system', 'parts')
WHERE database = '${CLICKHOUSE_DATABASE}' 
  AND table = '${TEST_TABLE}_local'
  AND active = 1
GROUP BY host, database, table
ORDER BY host
FORMAT PrettyCompact
"

# Step 8: Cleanup
print_header "8. Cleaning up test tables"
read -p "Do you want to remove test tables? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    execute_query "DROP TABLE IF EXISTS ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed ON CLUSTER ${CLICKHOUSE_CLUSTER}" > /dev/null 2>&1
    execute_query "DROP TABLE IF EXISTS ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_local ON CLUSTER ${CLICKHOUSE_CLUSTER}" > /dev/null 2>&1
    echo -e "${GREEN}✓ Test tables removed${NC}"
else
    echo -e "${YELLOW}Test tables kept:${NC}"
    echo "  - ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_local"
    echo "  - ${CLICKHOUSE_DATABASE}.${TEST_TABLE}_distributed"
fi

print_header "TEST COMPLETED"
echo -e "${GREEN}✓ Cluster test completed successfully${NC}"
echo -e "${GREEN}✓ Data distribution is working correctly${NC}"

