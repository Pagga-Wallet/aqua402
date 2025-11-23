// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IX402Credit.sol";

/**
 * @title MockX402Credit
 * @notice Mock implementation of x402 Credit for testing
 */
contract MockX402Credit is IX402Credit {
    mapping(uint256 => CreditLine) public creditLines;
    uint256 public creditLineCounter = 1; // Start from 1, 0 means "not found"

    function openCreditLine(
        address borrower,
        address lender,
        uint256 limit,
        uint256 rateBps,
        uint256 expiresAt
    ) external override returns (uint256) {
        uint256 creditLineId = creditLineCounter++;
        creditLines[creditLineId] = CreditLine({
            borrower: borrower,
            lender: lender,
            limit: limit,
            drawn: 0,
            rateBps: rateBps,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            active: true
        });
        return creditLineId;
    }

    function draw(uint256 creditLineId, uint256 amount) external override {
        require(creditLines[creditLineId].active, "Credit line not active");
        require(
            creditLines[creditLineId].drawn + amount <= creditLines[creditLineId].limit,
            "Exceeds limit"
        );
        creditLines[creditLineId].drawn += amount;
    }

    function repay(uint256 creditLineId, uint256 amount) external override {
        require(creditLines[creditLineId].active, "Credit line not active");
        require(creditLines[creditLineId].drawn >= amount, "Repay exceeds drawn");
        creditLines[creditLineId].drawn -= amount;
    }

    function getCreditLine(
        uint256 creditLineId
    ) external view override returns (CreditLine memory) {
        return creditLines[creditLineId];
    }
}

