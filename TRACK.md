# Track Information

This document describes how the project uses the following protocols/APIs for prize eligibility at [ETHGlobal Buenos Aires](https://ethglobal.com/events/buenosaires).

## [1inch - $20000](https://ethglobal.com/events/buenosaires/prizes/1inch)

### How are you using this Protocol / API?

We are using 1inch Aqua protocol for shared liquidity pool integration. The system allows lenders to connect their liquidity to the Aqua pool, which can then be reserved for credit lines created through the RFQ (Request for Quote) and auction mechanisms. The integration enables efficient liquidity management and sharing across the platform.

### Link to the line of code where the tech is used:

**Smart Contract Integration:**
- [AquaIntegration.sol](https://github.com/Pagga-Wallet/aqua402/blob/main/contracts/contracts_src/aqua/AquaIntegration.sol#L8-L12) - Main integration contract for 1inch Aqua shared liquidity
- [AquaIntegration.sol - connectLiquidity function](https://github.com/Pagga-Wallet/aqua402/blob/main/contracts/contracts_src/aqua/AquaIntegration.sol#L33-L46) - Function to connect liquidity to Aqua pool
- [AquaIntegration.sol - reserveLiquidity function](https://github.com/Pagga-Wallet/aqua402/blob/main/contracts/contracts_src/aqua/AquaIntegration.sol#L64-L75) - Function to reserve liquidity for credit lines
- [AquaIntegration.sol - swapViaAqua function](https://github.com/Pagga-Wallet/aqua402/blob/main/contracts/contracts_src/aqua/AquaIntegration.sol#L88-L104) - Function for swapping via Aqua SDK

**Backend Service:**
- [aqua/service.go](https://github.com/Pagga-Wallet/aqua402/blob/main/backend/internal/services/aqua/service.go#L34-L48) - Service for connecting liquidity through 1inch Aqua
- [aqua/service.go - WithdrawLiquidity](https://github.com/Pagga-Wallet/aqua402/blob/main/backend/internal/services/aqua/service.go#L50-L63) - Service for withdrawing liquidity from Aqua

**Backend Handler:**
- [handlers/aqua.go](https://github.com/Pagga-Wallet/aqua402/blob/main/backend/internal/handlers/aqua.go#L23-L52) - REST API handler for connecting liquidity through 1inch Aqua
- [handlers/aqua.go - WithdrawLiquidity](https://github.com/Pagga-Wallet/aqua402/blob/main/backend/internal/handlers/aqua.go#L54-L83) - REST API handler for withdrawing liquidity

**API Routes:**
- [setup.go - Aqua routes](https://github.com/Pagga-Wallet/aqua402/blob/main/backend/cmd/api/setup.go#L68-L70) - API endpoints for Aqua liquidity operations

**Architecture Documentation:**
- [architecture.md](https://github.com/Pagga-Wallet/aqua402/blob/main/docs/architecture.md#L19) - Documentation mentioning 1inch Aqua integration
- [architecture.md - Integrations](https://github.com/Pagga-Wallet/aqua402/blob/main/docs/architecture.md#L56) - Integration section describing 1inch Aqua usage

### How easy is it to use the API / Protocol? (1 - very difficult, 10 - very easy)

**Rating: 8/10**

The 1inch Aqua protocol provides a well-structured approach to shared liquidity pools. The integration is straightforward with clear contract interfaces. The documentation is helpful, though some parts of the SDK integration require additional implementation work. The concept of shared liquidity pools is powerful and fits well with our use case of managing lender liquidity for credit lines.

### Additional feedback

The 1inch Aqua protocol is an excellent solution for shared liquidity management. It allows multiple lenders to contribute to a common pool, which increases capital efficiency. The integration with our RFQ and auction mechanisms enables dynamic liquidity allocation based on borrower demand. We appreciate the flexibility of the protocol and its compatibility with EVM networks.

---

## [Polygon - $20000](https://ethglobal.com/events/buenosaires/prizes/polygon)

### How are you using this Protocol / API?

We are using Polygon (specifically Polygon Mumbai testnet) as one of the supported EVM networks for our application. The frontend is configured to connect to Polygon Mumbai network, allowing users to interact with smart contracts deployed on Polygon. This enables cross-chain compatibility and provides users with access to Polygon's lower transaction fees and faster confirmation times.

### Link to the line of code where the tech is used:

**Frontend Configuration:**
- [wagmi.ts - Polygon chain import](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/lib/evm/wagmi.ts#L2) - Import of polygonMumbai chain from wagmi
- [wagmi.ts - Chains configuration](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/lib/evm/wagmi.ts#L6) - Configuration including polygonMumbai in the chains array
- [wagmi.ts - Transport configuration](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/lib/evm/wagmi.ts#L16) - HTTP transport configuration for Polygon Mumbai network

**Hardhat Configuration:**
- [hardhat.config.ts - Mumbai network](https://github.com/Pagga-Wallet/aqua402/blob/main/contracts/hardhat.config.ts#L35-L39) - Hardhat network configuration for Polygon Mumbai testnet
- [hardhat.config.ts - PolygonScan API](https://github.com/Pagga-Wallet/aqua402/blob/main/contracts/hardhat.config.ts#L44) - PolygonScan API key configuration for contract verification

**Architecture Documentation:**
- [architecture.md - EVM Networks](https://github.com/Pagga-Wallet/aqua402/blob/main/docs/architecture.md#L58) - Documentation mentioning Polygon Mumbai as supported network

### How easy is it to use the API / Protocol? (1 - very difficult, 10 - very easy)

**Rating: 9/10**

Polygon is extremely easy to integrate with standard EVM tooling. Since it's fully EVM-compatible, we can use the same tools, libraries, and patterns we use for Ethereum mainnet. The wagmi library provides excellent support for Polygon networks out of the box. The network configuration is straightforward, and the RPC endpoints are reliable. The only minor consideration is managing different network IDs and ensuring proper chain configuration.

### Additional feedback

Polygon provides an excellent developer experience with full EVM compatibility. The integration was seamless - we simply added the polygonMumbai chain to our wagmi configuration and configured the Hardhat network settings. The lower transaction fees and faster block times make it ideal for testing and development. The network's reliability and growing ecosystem make it a great choice for production deployments as well.

---

## [Coinbase Developer Platform - $20000](https://ethglobal.com/events/buenosaires/prizes/coinbase-developer-platform)

### How are you using this Protocol / API?

We are using Coinbase Developer Platform through WalletConnect integration, which enables users to connect their Coinbase Wallet and other wallets to our application. The WalletConnect connector is configured in our wagmi setup, allowing seamless wallet connections including Coinbase Wallet through the injected connector. This provides users with a secure and user-friendly way to interact with our DeFi application.

### Link to the line of code where the tech is used:

**Frontend Wallet Configuration:**
- [wagmi.ts - WalletConnect import](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/lib/evm/wagmi.ts#L3) - Import of walletConnect connector from wagmi
- [wagmi.ts - WalletConnect configuration](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/lib/evm/wagmi.ts#L10-L12) - WalletConnect connector setup with project ID from environment variables

**WalletConnect Component:**
- [WalletConnect.tsx](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/shared/components/WalletConnect.tsx#L1-L36) - Component for wallet connection using wagmi hooks, which supports Coinbase Wallet through injected connector

**Environment Configuration:**
- [docker-compose.yml - WalletConnect Project ID](https://github.com/Pagga-Wallet/aqua402/blob/main/docker-compose.yml#L54) - Environment variable configuration for WalletConnect project ID

**Application Integration:**
- [App.tsx - WalletConnect component](https://github.com/Pagga-Wallet/aqua402/blob/main/frontend/src/App.tsx#L20) - Integration of WalletConnect component in the main application

### How easy is it to use the API / Protocol? (1 - very difficult, 10 - very easy)

**Rating: 9/10**

The Coinbase Developer Platform, through WalletConnect, is very easy to integrate. The wagmi library provides excellent abstractions that make wallet connections straightforward. Setting up WalletConnect requires only a project ID from the WalletConnect Cloud, and the connector handles all the complexity of wallet connections. The injected connector automatically detects and supports Coinbase Wallet when installed in the user's browser. The developer experience is excellent with clear documentation and helpful error messages.

### Additional feedback

The Coinbase Developer Platform provides a seamless wallet connection experience. WalletConnect integration allows our application to support multiple wallets including Coinbase Wallet, MetaMask, and others through a unified interface. The platform's focus on user experience and security makes it an ideal choice for DeFi applications. The integration was quick and painless, requiring minimal configuration. The support for multiple chains (including Polygon) through the same connection mechanism is particularly valuable for our cross-chain application.

