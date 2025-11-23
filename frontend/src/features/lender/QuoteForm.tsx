import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../../lib/evm/contracts'
import { RFQ_ABI } from '../../lib/evm/abis'
import { parseEther } from 'viem'

interface QuoteFormProps {
  rfqId: string
  onSubmitted?: () => void
}

export const QuoteForm = ({ rfqId, onSubmitted }: QuoteFormProps) => {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  
  const [rateBps, setRateBps] = useState('')
  const [limit, setLimit] = useState('')
  const [collateralRequired, setCollateralRequired] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !writeContract) return

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.rfq as `0x${string}`,
        abi: RFQ_ABI,
        functionName: 'submitQuote',
        args: [
          BigInt(rfqId),
          parseInt(rateBps),
          parseEther(limit),
          parseEther(collateralRequired || '0')
        ],
      })
      
      if (onSubmitted) {
        onSubmitted()
      }
    } catch (error) {
      console.error('Failed to submit quote:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quote-form">
      <h4>Submit Quote</h4>
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
      <div>
        <label>Collateral Required (ETH)</label>
        <input
          type="text"
          value={collateralRequired}
          onChange={(e) => setCollateralRequired(e.target.value)}
          placeholder="0"
        />
      </div>
      <button type="submit" disabled={isPending || !address}>
        {isPending ? 'Submitting...' : 'Submit Quote'}
      </button>
    </form>
  )
}

