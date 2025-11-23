package repositories

import (
	"context"
	"database/sql"

	_ "github.com/ClickHouse/clickhouse-go/v2"
)

// Repository handles database operations using ClickHouse directly
type Repository struct {
	db *sql.DB
}

// NewRepository creates a new repository instance
func NewRepository(dsn string) (*Repository, error) {
	sqldb, err := sql.Open("clickhouse", dsn)
	if err != nil {
		return nil, err
	}

	return &Repository{db: sqldb}, nil
}

// Close closes the database connection
func (r *Repository) Close() error {
	return r.db.Close()
}

// DB returns the underlying database instance
func (r *Repository) DB() *sql.DB {
	return r.db
}

// RFQRepository handles RFQ data operations
type RFQRepository struct {
	*Repository
}

// NewRFQRepository creates a new RFQ repository
func NewRFQRepository(repo *Repository) *RFQRepository {
	return &RFQRepository{Repository: repo}
}

// SaveRFQ saves an RFQ to the database
func (r *RFQRepository) SaveRFQ(ctx context.Context, rfq *RFQModel) error {
	query := `INSERT INTO rfqs (borrower_address, amount, duration, collateral_type, flow_description, status, created_at) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		rfq.BorrowerAddress, rfq.Amount, rfq.Duration, rfq.CollateralType,
		rfq.FlowDescription, rfq.Status, rfq.CreatedAt)
	return err
}

// GetRFQ retrieves an RFQ by ID
func (r *RFQRepository) GetRFQ(ctx context.Context, id uint64) (*RFQModel, error) {
	rfq := new(RFQModel)
	query := `SELECT id, borrower_address, amount, duration, collateral_type, flow_description, status, created_at 
	          FROM rfqs WHERE id = ?`
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rfq.ID, &rfq.BorrowerAddress, &rfq.Amount, &rfq.Duration,
		&rfq.CollateralType, &rfq.FlowDescription, &rfq.Status, &rfq.CreatedAt)
	return rfq, err
}

// ListRFQs retrieves RFQs with pagination
func (r *RFQRepository) ListRFQs(ctx context.Context, limit, offset int) ([]*RFQModel, error) {
	query := `SELECT id, borrower_address, amount, duration, collateral_type, flow_description, status, created_at 
	          FROM rfqs ORDER BY created_at DESC LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rfqs []*RFQModel
	for rows.Next() {
		rfq := new(RFQModel)
		err := rows.Scan(
			&rfq.ID, &rfq.BorrowerAddress, &rfq.Amount, &rfq.Duration,
			&rfq.CollateralType, &rfq.FlowDescription, &rfq.Status, &rfq.CreatedAt)
		if err != nil {
			return nil, err
		}
		rfqs = append(rfqs, rfq)
	}
	return rfqs, rows.Err()
}

// RFQModel represents RFQ data in ClickHouse
type RFQModel struct {
	ID              uint64
	BorrowerAddress string
	Amount          string
	Duration        uint64
	CollateralType  uint8
	FlowDescription string
	Status          string
	CreatedAt       int64
}

// AuctionRepository handles Auction data operations
type AuctionRepository struct {
	*Repository
}

// NewAuctionRepository creates a new Auction repository
func NewAuctionRepository(repo *Repository) *AuctionRepository {
	return &AuctionRepository{Repository: repo}
}

// SaveAuction saves an Auction to the database
func (r *AuctionRepository) SaveAuction(ctx context.Context, auction *AuctionModel) error {
	query := `INSERT INTO auctions (borrower_address, amount, duration, end_time, status, created_at) 
	          VALUES (?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query,
		auction.BorrowerAddress, auction.Amount, auction.Duration,
		auction.EndTime, auction.Status, auction.CreatedAt)
	return err
}

// GetAuction retrieves an Auction by ID
func (r *AuctionRepository) GetAuction(ctx context.Context, id uint64) (*AuctionModel, error) {
	auction := new(AuctionModel)
	query := `SELECT id, borrower_address, amount, duration, end_time, status, created_at 
	          FROM auctions WHERE id = ?`
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&auction.ID, &auction.BorrowerAddress, &auction.Amount, &auction.Duration,
		&auction.EndTime, &auction.Status, &auction.CreatedAt)
	return auction, err
}

// ListAuctions retrieves Auctions with pagination
func (r *AuctionRepository) ListAuctions(ctx context.Context, limit, offset int) ([]*AuctionModel, error) {
	query := `SELECT id, borrower_address, amount, duration, end_time, status, created_at 
	          FROM auctions ORDER BY created_at DESC LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var auctions []*AuctionModel
	for rows.Next() {
		auction := new(AuctionModel)
		err := rows.Scan(
			&auction.ID, &auction.BorrowerAddress, &auction.Amount, &auction.Duration,
			&auction.EndTime, &auction.Status, &auction.CreatedAt)
		if err != nil {
			return nil, err
		}
		auctions = append(auctions, auction)
	}
	return auctions, rows.Err()
}

// AuctionModel represents Auction data in ClickHouse
type AuctionModel struct {
	ID              uint64
	BorrowerAddress string
	Amount          string
	Duration        uint64
	BiddingDuration uint64
	EndTime         int64
	Status          string
	CreatedAt       int64
}
