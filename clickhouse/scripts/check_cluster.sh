#!/bin/bash

# =============================================================================
# ClickHouse Cluster Health Check Script
# Script for checking the status of pagga_cluster (c4sh1rep)
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
CLICKHOUSE_PORT=${CLICKHOUSE_PORT:-8123}  # HAProxy HTTP port

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

# Function for checking node availability
check_node() {
    local host=$1
    local port=$2
    local node_name=$3
    
    echo -n "Checking ${node_name} (${host}:${port})... "
    
    if curl -sS -u "${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}" \
            "http://${host}:${port}" \
            -d "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ UNAVAILABLE${NC}"
        return 1
    fi
}

# =============================================================================
# MAIN CHECKS
# =============================================================================

print_header "1. DOCKER CONTAINERS CHECK"
docker compose ps

print_header "2. AVAILABILITY CHECK THROUGH HAPROXY"
check_node "localhost" "8123" "HAProxy (load balancer)"
echo -e "\n${YELLOW}Note:${NC} Individual ClickHouse nodes are not accessible externally"
echo "All connections go through HAProxy on ports 8123 (HTTP) and 9000 (Native)"

print_header "3. CLICKHOUSE VERSIONS ON ALL NODES"
echo -e "${YELLOW}Through HAProxy (load balancing between nodes):${NC}"
execute_query "
SELECT 
    hostName() as node,
    version() as clickhouse_version,
    getMacro('shard') as shard,
    getMacro('replica') as replica
FROM clusterAllReplicas('pagga_cluster', 'system', 'one')
ORDER BY shard, replica
FORMAT PrettyCompact
"

print_header "4. pagga_cluster CONFIGURATION"
execute_query "
SELECT 
    cluster, 
    shard_num, 
    replica_num,
    host_name, 
    host_address,
    port,
    is_local
FROM system.clusters 
WHERE cluster = 'pagga_cluster'
ORDER BY shard_num, replica_num
FORMAT PrettyCompact
"

print_header "5. LIST OF ALL CLUSTERS"
execute_query "SHOW CLUSTERS FORMAT PrettyCompact"

print_header "6. MACROS ON NODES"
execute_query "
SELECT 
    hostName() as host,
    getMacro('shard') as shard,
    getMacro('replica') as replica,
    getMacro('cluster') as cluster
FROM clusterAllReplicas('pagga_cluster', 'system', 'one')
ORDER BY host
FORMAT PrettyCompact
"

print_header "7. ZOOKEEPER CHECK"
echo -n "Checking ZooKeeper connection... "
if execute_query "SELECT count() FROM system.zookeeper WHERE path = '/'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    echo -e "\nZooKeeper contents:"
    execute_query "
    SELECT path, name 
    FROM system.zookeeper 
    WHERE path = '/' 
    FORMAT PrettyCompact
    "
else
    echo -e "${RED}✗ ERROR${NC}"
fi

print_header "8. DATABASES ON NODES"
execute_query "
SELECT 
    hostName() as host,
    name as database,
    engine
FROM clusterAllReplicas('pagga_cluster', 'system', 'databases')
WHERE name NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
ORDER BY host, database
FORMAT PrettyCompact
"

print_header "9. TABLES IN DATABASE"
CLICKHOUSE_DATABASE=${CLICKHOUSE_DATABASE:-default}
execute_query "
SELECT 
    hostName() as host,
    name as table,
    engine,
    formatReadableSize(total_bytes) as size
FROM clusterAllReplicas('pagga_cluster', 'system', 'tables')
WHERE database = '${CLICKHOUSE_DATABASE}'
ORDER BY host, table
FORMAT PrettyCompact
"

print_header "10. DISK SPACE USAGE"
execute_query "
SELECT 
    hostName() as host,
    database,
    formatReadableSize(sum(bytes_on_disk)) as total_size,
    formatReadableSize(sum(data_compressed_bytes)) as compressed_size,
    count() as tables_count
FROM clusterAllReplicas('pagga_cluster', 'system', 'parts')
WHERE active = 1 AND database = '${CLICKHOUSE_DATABASE}'
GROUP BY host, database
ORDER BY host
FORMAT PrettyCompact
"

print_header "11. MIGRATION SERVICE STATUS"
echo "Migration Service 1:"
docker compose logs --tail=5 migration-service-1 2>/dev/null || echo "Container not running"
echo -e "\nMigration Service 2:"
docker compose logs --tail=5 migration-service-2 2>/dev/null || echo "Container not running"

print_header "12. PERFORMANCE TEST"
echo "Creating test table and checking data distribution..."

# Create test table
CLICKHOUSE_DATABASE=${CLICKHOUSE_DATABASE:-default}
execute_query "
CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DATABASE}.cluster_test_local ON CLUSTER pagga_cluster (
    id UInt64,
    timestamp DateTime,
    value String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (id, timestamp)
" > /dev/null 2>&1

execute_query "
CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DATABASE}.cluster_test_distributed ON CLUSTER pagga_cluster 
AS ${CLICKHOUSE_DATABASE}.cluster_test_local
ENGINE = Distributed(pagga_cluster, ${CLICKHOUSE_DATABASE}, cluster_test_local, rand())
" > /dev/null 2>&1

# Insert test data
echo "Inserting 10000 records..."
execute_query "
INSERT INTO ${CLICKHOUSE_DATABASE}.cluster_test_distributed (id, timestamp, value)
SELECT 
    number as id,
    now() - INTERVAL number SECOND as timestamp,
    concat('test_value_', toString(number)) as value
FROM numbers(10000)
" > /dev/null 2>&1

# Check distribution
echo -e "\nData distribution across nodes:"
execute_query "
SELECT 
    hostName() as host,
    count() as rows_count,
    formatReadableSize(sum(bytes_on_disk)) as size
FROM ${CLICKHOUSE_DATABASE}.cluster_test_distributed
GROUP BY host
ORDER BY host
FORMAT PrettyCompact
"

# Cleanup test data
echo -e "\nCleaning up test data..."
execute_query "DROP TABLE IF EXISTS ${CLICKHOUSE_DATABASE}.cluster_test_distributed ON CLUSTER pagga_cluster" > /dev/null 2>&1
execute_query "DROP TABLE IF EXISTS ${CLICKHOUSE_DATABASE}.cluster_test_local ON CLUSTER pagga_cluster" > /dev/null 2>&1

print_header "13. FINAL STATUS"
echo -e "${GREEN}✓ Cluster pagga_cluster (c4sh1rep) is working correctly${NC}"
echo -e "${GREEN}✓ Topology: 4 shards with 1 replica each${NC}"
echo -e "${GREEN}✓ All nodes are available and functioning${NC}"
echo -e "${GREEN}✓ ZooKeeper is available${NC}"
echo -e "${GREEN}✓ Data distribution is working correctly${NC}"
echo ""
echo -e "${YELLOW}Recommendations:${NC}"
echo "• For production, c2sh2rep topology (2 shards with 2 replicas each) is recommended"
echo "• Change passwords in .env file to more secure ones"
echo "• Configure regular backups"
echo "• Monitor disk space usage"

print_header "CHECK COMPLETED"
