import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES, getAuctionContract } from '../../lib/evm/contracts'
import { parseEther } from 'ethers'

export const CreateAuctionForm = () => {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [biddingDuration, setBiddingDuration] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !writeContract) return

    try {
      const auctionContract = getAuctionContract(CONTRACT_ADDRESSES.auction, {} as any)
      const durationSeconds = parseInt(duration) * 24 * 60 * 60
      const biddingDurationSeconds = parseInt(biddingDuration) * 60 * 60
      
      await writeContract({
        address: CONTRACT_ADDRESSES.auction as `0x${string}`,
        abi: auctionContract.interface.format('json') as any,
        functionName: 'createAuction',
        args: [
          parseEther(amount),
          BigInt(durationSeconds),
          BigInt(biddingDurationSeconds)
        ],
      })
    } catch (error) {
      console.error('Failed to create auction:', error)
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
      <button type="submit" disabled={isPending || !address}>
        {isPending ? 'Creating...' : 'Create Auction'}
      </button>
    </form>
  )
}

