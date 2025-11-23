CREATE TABLE IF NOT EXISTS rfqs
(
    id UInt64,
    borrower_address String,
    amount String,
    duration UInt64,
    collateral_type UInt8,
    flow_description String,
    status String,
    created_at Int64
)
ENGINE = MergeTree()
ORDER BY (id, created_at)
SETTINGS index_granularity = 8192;

