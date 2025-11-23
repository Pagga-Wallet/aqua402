CREATE TABLE IF NOT EXISTS bids
(
    id UInt64,
    auction_id UInt64,
    lender_address String,
    rate_bps UInt16,
    limit String,
    timestamp Int64,
    is_winning UInt8
)
ENGINE = MergeTree()
ORDER BY (auction_id, timestamp)
SETTINGS index_granularity = 8192;

