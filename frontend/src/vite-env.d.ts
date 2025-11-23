/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_HARDHAT_RPC_URL: string
  readonly VITE_RFQ_ADDRESS: string
  readonly VITE_AUCTION_ADDRESS: string
  readonly VITE_AQUA_ADDRESS: string
  readonly VITE_AGENT_FINANCE_ADDRESS: string
  readonly VITE_X402_CREDIT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Window interface for MetaMask
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>
    isMetaMask?: boolean
  }
}

