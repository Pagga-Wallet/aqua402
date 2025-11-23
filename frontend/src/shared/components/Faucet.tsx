import { useState, useEffect } from 'react'
import { useAccount, useSwitchChain, useBalance, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
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

export const Faucet = () => {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address && chainId === hardhatLocal.id,
      refetchInterval: 5000, // Refetch balance every 5 seconds
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  // Use chainId from useAccount() which is more reliable and updates when network changes
  const currentChainId = chainId || 0

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
    query: {
      enabled: !!txHash,
    },
  })

  // Refetch balance when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && txHash) {
      // Wait a bit for the node to update, then refetch balance
      setTimeout(() => {
        refetchBalance()
      }, 1000)
    }
  }, [isConfirmed, txHash, refetchBalance])

  const handleSwitchToHardhat = async () => {
    try {
      // First, add the network to MetaMask with correct RPC URL
      await addHardhatNetworkToMetaMask()
      // Then switch to it
      await switchChain({ chainId: hardhatLocal.id })
    } catch (error: any) {
      console.error('Failed to switch to Hardhat network:', error)
      setError(`Failed to switch network: ${error.message || 'Unknown error'}`)
    }
  }

  // Show faucet only for local Hardhat network (chainId 1337)
  // If not on Hardhat, show message to switch network
  if (currentChainId !== hardhatLocal.id) {
    if (!address) {
      return null // Don't show if wallet not connected
    }
    return (
      <div className="faucet" style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', margin: '10px 0' }}>
        <p style={{ margin: '0 0 10px 0' }}>
          Current network: <strong>Chain ID {currentChainId}</strong>. Switch to <strong>PAGGA Local (Chain ID: {hardhatLocal.id})</strong> to use the faucet.
        </p>
        <button
          onClick={handleSwitchToHardhat}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add & Switch to PAGGA Local
        </button>
        {error && (
          <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
        )}
      </div>
    )
  }

  const handleRequestTokens = async () => {
    if (!address) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://aquax402.pagga.io/api/v1'
      const response = await fetch(`${apiUrl}/faucet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          amount: '1.0', // Request 1 ETH by default
        }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      const receivedTxHash = data.tx_hash || data.txHash
      setTxHash(receivedTxHash)
      setSuccess(`Transaction sent! Hash: ${receivedTxHash}`)
      
      // Balance will be updated automatically when transaction is confirmed
    } catch (err) {
      console.error('Faucet error:', err)
      setError(err instanceof Error ? err.message : 'Failed to request tokens')
    } finally {
      setLoading(false)
    }
  }

  if (!address) {
    return (
      <div className="faucet">
        <p>Connect your wallet to request test tokens</p>
      </div>
    )
  }

  return (
    <div className="faucet" style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', margin: '10px 0' }}>
      <h3 style={{ marginTop: 0 }}>Test Faucet</h3>
      <p>Get test ETH for the PAGGA Local network</p>
      
      {/* Display balance if available */}
      {address && (
        <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: '0', fontSize: '14px' }}>
              <strong>Balance:</strong>{' '}
              {balanceLoading ? (
                <span>Loading...</span>
              ) : balance ? (
                `${parseFloat(formatEther(balance.value)).toFixed(4)} ${balance.symbol}`
              ) : (
                <span>0 ETH</span>
              )}
            </p>
            <button
              onClick={() => refetchBalance()}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              disabled={balanceLoading}
            >
              {balanceLoading ? '...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}
      
      <button
        onClick={handleRequestTokens}
        disabled={loading || balanceLoading}
        style={{
          padding: '8px 16px',
          backgroundColor: loading || balanceLoading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || balanceLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Requesting...' : 'Get 1 ETH'}
      </button>
      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
      )}
      {success && (
        <div style={{ color: 'green', marginTop: '8px' }}>
          {success}
          {isConfirming && (
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              Waiting for confirmation...
            </div>
          )}
          {isConfirmed && (
            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>
              ✓ Transaction confirmed! Balance updated.
            </div>
          )}
        </div>
      )}
    </div>
  )
}


