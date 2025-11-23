// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IX402Credit
 * @notice Interface for x402 Credit Line protocol
 */
interface IX402Credit {
    struct CreditLine {
        address borrower;
        address lender;
        uint256 limit;
        uint256 drawn;
        uint256 rateBps;
        uint256 createdAt;
        uint256 expiresAt;
        bool active;
    }

    function openCreditLine(
        address borrower,
        address lender,
        uint256 limit,
        uint256 rateBps,
        uint256 expiresAt
    ) external returns (uint256 creditLineId);

    function draw(uint256 creditLineId, uint256 amount) external;

    function repay(uint256 creditLineId, uint256 amount) external;

    function getCreditLine(uint256 creditLineId) external view returns (CreditLine memory);
}

