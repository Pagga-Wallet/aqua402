package faucet

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"os"

	"github.com/Pagga-Wallet/aqua402/pkg/evm"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"go.uber.org/zap"
)

type Service struct {
	evmClient  *evm.Client
	privateKey *ecdsa.PrivateKey
	chainID    *big.Int
	logger     *zap.Logger
}

func NewService(evmClient *evm.Client, logger *zap.Logger) (*Service, error) {
	// Get private key from environment variable
	privateKeyHex := os.Getenv("FAUCET_PRIVATE_KEY")
	if privateKeyHex == "" {
		// Default Hardhat account #0 private key for testing
		// This is the first account from Hardhat's default accounts
		privateKeyHex = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
		logger.Warn("FAUCET_PRIVATE_KEY not set, using default Hardhat account #0")
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex[2:]) // Remove 0x prefix
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	// Get chain ID from environment or use default (1337 for Hardhat)
	chainIDStr := os.Getenv("FAUCET_CHAIN_ID")
	chainID := big.NewInt(1337) // Default Hardhat chain ID
	if chainIDStr != "" {
		chainID, _ = chainID.SetString(chainIDStr, 10)
	}

	return &Service{
		evmClient:  evmClient,
		privateKey: privateKey,
		chainID:    chainID,
		logger:     logger,
	}, nil
}

type RequestTokensRequest struct {
	Address string `json:"address"`
	Amount  string `json:"amount"` // Amount in ETH (will be converted to Wei)
}

func (s *Service) RequestTokens(ctx context.Context, req RequestTokensRequest) (string, error) {
	// Validate address
	toAddress := common.HexToAddress(req.Address)
	if toAddress == (common.Address{}) {
		return "", fmt.Errorf("invalid address: %s", req.Address)
	}

	// Parse amount (in ETH) and convert to Wei
	amount, ok := new(big.Float).SetString(req.Amount)
	if !ok {
		return "", fmt.Errorf("invalid amount: %s", req.Amount)
	}
	// Convert ETH to Wei
	weiPerEth := big.NewFloat(1e18)
	amountWei, _ := new(big.Float).Mul(amount, weiPerEth).Int(nil)

	// Get sender address from private key
	fromAddress := crypto.PubkeyToAddress(s.privateKey.PublicKey)

	// Get nonce
	nonce, err := s.evmClient.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}

	// Get gas price
	gasPrice, err := s.evmClient.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %w", err)
	}

	// Create transaction
	tx := types.NewTransaction(
		nonce,
		toAddress,
		amountWei,
		21000, // Standard ETH transfer gas limit
		gasPrice,
		nil,
	)

	// Sign transaction
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(s.chainID), s.privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	// Send transaction
	if err := s.evmClient.SendTransaction(ctx, signedTx); err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	txHash := signedTx.Hash().Hex()
	s.logger.Info("Faucet transaction sent",
		zap.String("to", req.Address),
		zap.String("amount", req.Amount),
		zap.String("tx_hash", txHash),
	)

	return txHash, nil
}
