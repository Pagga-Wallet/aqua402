CREATE TABLE IF NOT EXISTS quotes
(
    id UInt64,
    rfq_id UInt64,
    lender_address String,
    rate_bps UInt16,
    limit String,
    collateral_required String,
    submitted_at Int64,
    accepted UInt8
)
ENGINE = MergeTree()
ORDER BY (rfq_id, submitted_at)
SETTINGS index_granularity = 8192;

