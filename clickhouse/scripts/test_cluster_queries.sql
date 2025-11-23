-- =============================================================================
-- ClickHouse Cluster Test Queries
-- Universal test queries for checking cluster operation
-- =============================================================================

-- 1. CLUSTER CONFIGURATION CHECK
-- =============================================================================

-- List all clusters
SHOW CLUSTERS;

-- Detailed information about cluster
-- Replace 'pagga_cluster' with your cluster name
SELECT
cluster,
shard_num,
shard_weight,
replica_num,
host_name,
host_address,
port,
is_local,
user
FROM system.clusters
WHERE
cluster = 'pagga_cluster'
ORDER BY shard_num, replica_num;

-- Check macros on all nodes
SELECT
    hostName () as host,
    getMacro ('shard') as shard,
    getMacro ('replica') as replica,
    getMacro ('cluster') as
cluster
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'one'
    )
ORDER BY host;

-- 2. CREATE TEST TABLES
-- =============================================================================

-- Create local table on all cluster nodes
-- Replace 'default' with your database name
CREATE TABLE IF NOT EXISTS default.cluster_test_local ON
CLUSTER pagga_cluster (
    id UInt64,
    user_id UInt32,
    event_type String,
    event_time DateTime,
    value Float64,
    metadata String
) ENGINE = MergeTree ()
PARTITION BY
    toYYYYMM (event_time)
ORDER BY (event_type, id, event_time) SETTINGS index_granularity = 8192;

-- Create Distributed table
CREATE TABLE IF NOT EXISTS default.cluster_test_distributed ON
CLUSTER pagga_cluster AS default.cluster_test_local ENGINE = Distributed (
    pagga_cluster,
    default,
    cluster_test_local,
    rand ()
);

-- Check table creation on all nodes
SELECT
    hostName () as host,
    database,
    name as table_name,
    engine,
    total_rows,
    formatReadableSize (total_bytes) as size
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'tables'
    )
WHERE
    database = 'default'
    AND name LIKE 'cluster_test%'
ORDER BY host, name;

-- 3. INSERT TEST DATA
-- =============================================================================

-- Insert 1 million records
INSERT INTO
    default.cluster_test_distributed (
        id,
        user_id,
        event_type,
        event_time,
        value,
        metadata
    )
SELECT
    number as id,
    number % 100000 as user_id,
    arrayElement (
        [
            'click',
            'view',
            'purchase',
            'signup',
            'logout'
        ],
        (number % 5) + 1
    ) as event_type,
    now() - INTERVAL(number % 86400) SECOND as event_time,
    rand () % 1000 + (rand () % 100) / 100.0 as value,
    concat(
        'metadata_',
        toString (number)
    ) as metadata
FROM numbers (1000000);

-- 4. CHECK DATA DISTRIBUTION
-- =============================================================================

-- Number of records on each node
SELECT
    hostName () as host,
    count() as rows_count,
    formatReadableSize (sum(bytes_on_disk)) as disk_size,
    formatReadableSize (sum(data_compressed_bytes)) as compressed_size,
    round(
        sum(data_compressed_bytes) / sum(data_uncompressed_bytes) * 100,
        2
    ) as compression_ratio
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'parts'
    )
WHERE
    database = 'default'
    AND table = 'cluster_test_local'
    AND active = 1
GROUP BY
    host
ORDER BY host;

-- Distribution by event types on each node
SELECT
    hostName () as host,
    event_type,
    count() as event_count,
    round(avg(value), 2) as avg_value
FROM default.cluster_test_distributed
GROUP BY
    host,
    event_type
ORDER BY host, event_type;

-- 5. TEST ANALYTICAL QUERIES
-- =============================================================================

-- Statistics by event types
SELECT
    event_type,
    count() as total_events,
    uniq (user_id) as unique_users,
    round(avg(value), 2) as avg_value,
    round(sum(value), 2) as total_value,
    min(event_time) as first_event,
    max(event_time) as last_event
FROM default.cluster_test_distributed
GROUP BY
    event_type
ORDER BY total_events DESC;

-- Top 20 most active users
SELECT
    user_id,
    count() as event_count,
    uniq (event_type) as unique_event_types,
    round(sum(value), 2) as total_value
FROM default.cluster_test_distributed
GROUP BY
    user_id
ORDER BY event_count DESC
LIMIT 20;

-- Time aggregation (by hours)
SELECT
    toStartOfHour (event_time) as hour,
    count() as events,
    uniq (user_id) as unique_users,
    round(avg(value), 2) as avg_value
FROM default.cluster_test_distributed
GROUP BY
    hour
ORDER BY hour DESC
LIMIT 24;

-- 6. PERFORMANCE CHECK
-- =============================================================================

-- Scan speed test
SELECT
    count() as total_rows,
    uniq (id) as unique_ids,
    uniq (user_id) as unique_users,
    formatReadableSize (sum(length(metadata))) as total_metadata_size
FROM default.cluster_test_distributed;

-- Aggregation test with grouping
SELECT
    event_type,
    toYYYYMM (event_time) as month,
    count() as events,
    round(sum(value), 2) as total_value,
    round(avg(value), 2) as avg_value,
    min(value) as min_value,
    max(value) as max_value
FROM default.cluster_test_distributed
GROUP BY
    event_type,
    month
ORDER BY event_type, month;

-- 7. PARTITION CHECK
-- =============================================================================

-- Partition information on all nodes
SELECT
    hostName () as host,
    partition,
    sum(rows) as rows_count,
    formatReadableSize (sum(bytes_on_disk)) as size,
    count() as parts_count,
    min(min_time) as min_time,
    max(max_time) as max_time
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'parts'
    )
WHERE
    database = 'default'
    AND table = 'cluster_test_local'
    AND active = 1
GROUP BY
    host,
    partition
ORDER BY host, partition;

-- 8. JOIN TEST BETWEEN NODES
-- =============================================================================

-- Create second test table
CREATE TABLE IF NOT EXISTS default.user_profiles_local ON
CLUSTER pagga_cluster (
    user_id UInt32,
    username String,
    email String,
    registration_date DateTime
) ENGINE = MergeTree ()
ORDER BY user_id;

CREATE TABLE IF NOT EXISTS default.user_profiles_distributed ON
CLUSTER pagga_cluster AS default.user_profiles_local ENGINE = Distributed (
    pagga_cluster,
    default,
    user_profiles_local,
    user_id
);

-- Insert user data
INSERT INTO
    default.user_profiles_distributed (
        user_id,
        username,
        email,
        registration_date
    )
SELECT
    number as user_id,
    concat('user_', toString (number)) as username,
    concat(
        'user_',
        toString (number),
        '@example.com'
    ) as email,
    now() - INTERVAL(number * 86400) SECOND as registration_date
FROM numbers (100000);

-- JOIN between tables
SELECT
    e.event_type,
    count(DISTINCT e.user_id) as unique_users,
    count() as total_events,
    round(avg(e.value), 2) as avg_value
FROM default.cluster_test_distributed e
    INNER JOIN default.user_profiles_distributed u ON e.user_id = u.user_id
WHERE
    u.registration_date >= now() - INTERVAL 30 DAY
GROUP BY
    e.event_type
ORDER BY total_events DESC;

-- 9. DISTRIBUTED QUERY EXECUTION CHECK
-- =============================================================================

-- Information about recent distributed queries
SELECT
    query_start_time,
    query_duration_ms,
    query,
    read_rows,
    formatReadableSize (read_bytes) as read_size,
    result_rows
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND query LIKE '%cluster_test_distributed%'
    AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY query_start_time DESC
LIMIT 10;

-- 10. CLEANUP (OPTIONAL)
-- =============================================================================

-- Delete test tables
-- UNCOMMENT IF YOU NEED TO CLEAN UP TEST DATA

-- DROP TABLE IF EXISTS default.cluster_test_distributed ON CLUSTER pagga_cluster;
-- DROP TABLE IF EXISTS default.cluster_test_local ON CLUSTER pagga_cluster;
-- DROP TABLE IF EXISTS default.user_profiles_distributed ON CLUSTER pagga_cluster;
-- DROP TABLE IF EXISTS default.user_profiles_local ON CLUSTER pagga_cluster;

-- 11. CLUSTER STATUS MONITORING
-- =============================================================================

-- General database statistics
SELECT
    hostName () as host,
    sum(rows) as total_rows,
    formatReadableSize (sum(bytes_on_disk)) as total_disk_size,
    formatReadableSize (sum(data_compressed_bytes)) as compressed_size,
    count(DISTINCT table) as tables_count,
    count(DISTINCT partition) as partitions_count,
    count() as parts_count
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'parts'
    )
WHERE
    database = 'default'
    AND active = 1
GROUP BY
    host
ORDER BY host;

-- Check replication queues (if replicated tables are used)
SELECT
    hostName () as host,
    database,
    table,
    engine,
    zookeeper_path,
    replica_name,
    total_replicas,
    active_replicas
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'replicas'
    )
WHERE
    database = 'default'
ORDER BY host, table;

-- Check merge operations
SELECT
    hostName () as host,
    database,
    table,
    elapsed,
    progress,
    formatReadableSize (total_size_bytes_compressed) as size,
    result_part_name
FROM clusterAllReplicas (
        'pagga_cluster', 'system', 'merges'
    )
WHERE
    database = 'default'
ORDER BY host, elapsed DESC;

-- =============================================================================
-- FINAL CHECK
-- =============================================================================

SELECT
    '✅ Cluster pagga_cluster is configured correctly' as status,
    (
        SELECT count()
        FROM system.clusters
        WHERE
        cluster = 'pagga_cluster'
    ) as cluster_exists,
    (
        SELECT count()
        FROM system.clusters
        WHERE
        cluster = 'pagga_cluster'
        AND shard_num > 0
    ) as shards_count,
    (
        SELECT count(*)
        FROM default.cluster_test_distributed
    ) as test_rows_count,
    now() as check_time;