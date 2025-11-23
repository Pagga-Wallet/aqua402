package evm

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Client wraps Ethereum client for EVM interactions
type Client struct {
	client *ethclient.Client
}

// NewClient creates a new EVM client
func NewClient(rpcURL string) (*Client, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, err
	}
	return &Client{client: client}, nil
}

// GetBalance returns the balance of an address
func (c *Client) GetBalance(ctx context.Context, address common.Address) (*big.Int, error) {
	return c.client.BalanceAt(ctx, address, nil)
}

// SendTransaction sends a transaction
func (c *Client) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	return c.client.SendTransaction(ctx, tx)
}

// TransactionReceipt returns the receipt of a transaction
func (c *Client) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	return c.client.TransactionReceipt(ctx, txHash)
}

// CallContract executes a message call
func (c *Client) CallContract(ctx context.Context, msg ethereum.CallMsg, blockNumber *big.Int) ([]byte, error) {
	return c.client.CallContract(ctx, msg, blockNumber)
}

// PendingNonceAt returns the account nonce of the given account in the pending state
func (c *Client) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	return c.client.PendingNonceAt(ctx, account)
}

// SuggestGasPrice retrieves the currently suggested gas price
func (c *Client) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	return c.client.SuggestGasPrice(ctx)
}

// EstimateGas tries to estimate the gas needed to execute a specific transaction
func (c *Client) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	return c.client.EstimateGas(ctx, msg)
}

// GetAuth returns a transaction auth for contract interactions
func (c *Client) GetAuth(ctx context.Context, privateKey string, chainID *big.Int) (*bind.TransactOpts, error) {
	// This would be implemented with actual private key handling
	// For now, return a placeholder
	return nil, nil
}

// FilterLogs executes a filter query
func (c *Client) FilterLogs(ctx context.Context, query ethereum.FilterQuery) ([]types.Log, error) {
	return c.client.FilterLogs(ctx, query)
}

// SubscribeFilterLogs creates a subscription that will receive logs matching the given query
func (c *Client) SubscribeFilterLogs(ctx context.Context, query ethereum.FilterQuery, ch chan<- types.Log) (ethereum.Subscription, error) {
	return c.client.SubscribeFilterLogs(ctx, query, ch)
}

// HeaderByNumber returns a block header from the current canonical chain
func (c *Client) HeaderByNumber(ctx context.Context, number *big.Int) (*types.Header, error) {
	return c.client.HeaderByNumber(ctx, number)
}

// BlockNumber returns the most recent block number
func (c *Client) BlockNumber(ctx context.Context) (uint64, error) {
	return c.client.BlockNumber(ctx)
}

// Client returns the underlying ethclient.Client
func (c *Client) Client() *ethclient.Client {
	return c.client
}

