import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../../lib/evm/contracts'
import { AUCTION_ABI } from '../../lib/evm/abis'
import { parseEther } from 'viem'

export const CreateAuctionForm = () => {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [biddingDuration, setBiddingDuration] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !writeContract) {
      setError('Please connect your wallet first')
      return
    }

    if (!CONTRACT_ADDRESSES.auction) {
      setError('Auction contract address not configured')
      return
    }

    setError(null)
    setTxHash(undefined)

    try {
      const durationSeconds = parseInt(duration) * 24 * 60 * 60
      const biddingDurationSeconds = parseInt(biddingDuration) * 60 * 60
      
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.auction as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'createAuction',
        args: [
          parseEther(amount),
          BigInt(durationSeconds),
          BigInt(biddingDurationSeconds)
        ],
      })

      setTxHash(hash)
      console.log('Auction transaction sent:', hash)
      
      // Reset form after successful transaction
      if (isConfirmed) {
        setAmount('')
        setDuration('')
        setBiddingDuration('')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create auction'
      console.error('Failed to create auction:', err)
      setError(errorMessage)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-auction-form">
      <h3>Create Auction</h3>
      <div>
        <label>Amount (ETH)</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Duration (days)</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Bidding Duration (hours)</label>
        <input
          type="number"
          value={biddingDuration}
          onChange={(e) => setBiddingDuration(e.target.value)}
          placeholder="24"
          required
        />
      </div>
      <button type="submit" disabled={isPending || isConfirming || !address}>
        {isPending ? 'Creating...' : isConfirming ? 'Waiting for confirmation...' : 'Create Auction'}
      </button>
      {txHash && (
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          Transaction Hash: <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.slice(0, 6)}...{txHash.slice(-4)}</a>
        </div>
      )}
      {isConfirming && (
        <div style={{ color: 'orange', marginTop: '8px' }}>Waiting for confirmation...</div>
      )}
      {isConfirmed && (
        <div style={{ color: 'green', marginTop: '8px' }}>✓ Transaction confirmed! Event will be processed by backend.</div>
      )}
      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
      )}
    </form>
  )
}

