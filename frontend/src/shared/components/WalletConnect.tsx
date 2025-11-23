import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { metaMask } from 'wagmi/connectors'
import { hardhatLocal } from '../../lib/evm/wagmi'

const HARDHAT_RPC_URL = import.meta.env.VITE_HARDHAT_RPC_URL || 'https://aquax402.pagga.io/api/hh'

// Function to add Hardhat network to MetaMask with correct RPC URL
const addHardhatNetworkToMetaMask = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${hardhatLocal.id.toString(16)}`, // 0x539 for 1337
          chainName: hardhatLocal.name,
          nativeCurrency: {
            name: hardhatLocal.nativeCurrency.name,
            symbol: hardhatLocal.nativeCurrency.symbol,
            decimals: hardhatLocal.nativeCurrency.decimals,
          },
          rpcUrls: [HARDHAT_RPC_URL],
          blockExplorerUrls: [], // No block explorer for local network
        },
      ],
    })
  } catch (error: any) {
    // If network already exists, that's fine
    if (error.code !== 4902) {
      throw error
    }
  }
}

export const WalletConnect = () => {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const handleSwitchToHardhat = async () => {
    try {
      // First, add the network to MetaMask with correct RPC URL
      await addHardhatNetworkToMetaMask()
      // Then switch to it
      await switchChain({ chainId: hardhatLocal.id })
    } catch (error: any) {
      console.error('Failed to switch to Hardhat network:', error)
      alert(`Failed to switch network: ${error.message || 'Unknown error'}`)
    }
  }

  if (isConnected) {
    // Use chainId from useAccount() which is more reliable and updates when network changes
    const currentChainId = chainId || 0
    const isHardhatNetwork = currentChainId === hardhatLocal.id
    const networkName = isHardhatNetwork 
      ? 'PAGGA Local (1337)' 
      : currentChainId === 1 
        ? 'Ethereum Mainnet (1)'
        : currentChainId === 11155111
          ? 'Sepolia (11155111)'
          : currentChainId === 80001
            ? 'Mumbai (80001)'
            : `Chain ID: ${currentChainId}`
    
    return (
      <div className="wallet-connect">
        <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        <p>
          Network: {networkName}
          {!isHardhatNetwork && (
            <button
              onClick={handleSwitchToHardhat}
              style={{ marginLeft: '10px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Add & Switch to PAGGA Local
            </button>
          )}
        </p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div className="wallet-connect">
      <h3>Connect Wallet</h3>
      <div>
        <button onClick={() => connect({ connector: metaMask() })}>
          MetaMask
        </button>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
          >
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  )
}

