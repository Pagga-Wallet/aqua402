-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS auctions
(
    id UInt64,
    borrower_address String,
    amount String,
    duration UInt64,
    end_time Int64,
    status String,
    created_at Int64
)
ENGINE = MergeTree()
ORDER BY (id, created_at)
SETTINGS index_granularity = 8192;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS auctions;
-- +goose StatementEnd

