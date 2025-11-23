import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES, getAuctionContract } from '../../lib/evm/contracts'
import { parseEther } from 'ethers'

interface BidFormProps {
  auctionId: string
  onSubmitted?: () => void
}

export const BidForm = ({ auctionId, onSubmitted }: BidFormProps) => {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  
  const [rateBps, setRateBps] = useState('')
  const [limit, setLimit] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !writeContract) return

    try {
      const auctionContract = getAuctionContract(CONTRACT_ADDRESSES.auction, {} as any)
      
      await writeContract({
        address: CONTRACT_ADDRESSES.auction as `0x${string}`,
        abi: auctionContract.interface.format('json') as any,
        functionName: 'placeBid',
        args: [
          BigInt(auctionId),
          parseInt(rateBps),
          parseEther(limit)
        ],
      })
      
      if (onSubmitted) {
        onSubmitted()
      }
    } catch (error) {
      console.error('Failed to place bid:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bid-form">
      <h4>Place Bid</h4>
      <div>
        <label>Rate (basis points)</label>
        <input
          type="number"
          value={rateBps}
          onChange={(e) => setRateBps(e.target.value)}
          placeholder="500"
          required
        />
      </div>
      <div>
        <label>Limit (ETH)</label>
        <input
          type="text"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={isPending || !address}>
        {isPending ? 'Placing...' : 'Place Bid'}
      </button>
    </form>
  )
}

