import { createConfig, http } from 'wagmi'
import { sepolia, polygonMumbai } from 'wagmi/chains'
import { defineChain } from 'viem'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Local PAGGA network configuration
export const hardhatLocal = defineChain({
  id: 1337,
  name: 'PAGGA Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_HARDHAT_RPC_URL || 'https://aquax402.pagga.io/api/hh'],
    },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [hardhatLocal, sepolia, polygonMumbai],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [hardhatLocal.id]: http(import.meta.env.VITE_HARDHAT_RPC_URL || 'https://aquax402.pagga.io/api/hh'),
    [sepolia.id]: http(),
    [polygonMumbai.id]: http(),
  },
})

