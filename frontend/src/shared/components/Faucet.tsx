import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'

export const Faucet = () => {
  const { address } = useAccount()
  const chainId = useChainId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Only show faucet for local Hardhat network (chainId 1337)
  if (chainId !== 1337) {
    return null
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/faucet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address,
          amount: '1.0', // Request 1 ETH by default
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request tokens')
      }

      setSuccess(`Success! Transaction hash: ${data.tx_hash}`)
    } catch (err) {
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
    <div className="faucet">
      <h3>Test Faucet</h3>
      <p>Get test ETH for the local Hardhat network</p>
      <button
        onClick={handleRequestTokens}
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: loading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Requesting...' : 'Get 1 ETH'}
      </button>
      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
      )}
      {success && (
        <div style={{ color: 'green', marginTop: '8px' }}>{success}</div>
      )}
    </div>
  )
}


