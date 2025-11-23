import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../../lib/evm/contracts'
import { RFQ_ABI } from '../../lib/evm/abis'
import { parseEther } from 'ethers'

export const CreateRFQForm = () => {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [collateralType, setCollateralType] = useState('0')
  const [flowDescription, setFlowDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !writeContract) return

    try {
      const durationSeconds = parseInt(duration) * 24 * 60 * 60
      
      await writeContract({
        address: CONTRACT_ADDRESSES.rfq as `0x${string}`,
        abi: RFQ_ABI,
        functionName: 'createRFQ',
        args: [
          parseEther(amount),
          BigInt(durationSeconds),
          parseInt(collateralType),
          flowDescription || 'ipfs://'
        ],
      })
    } catch (error) {
      console.error('Failed to create RFQ:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-rfq-form">
      <h3>Create RFQ</h3>
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
        <label>Collateral Type</label>
        <select
          value={collateralType}
          onChange={(e) => setCollateralType(e.target.value)}
        >
          <option value="0">None</option>
          <option value="1">ERC20</option>
          <option value="2">NFT</option>
        </select>
      </div>
      <div>
        <label>Flow Description (IPFS URI)</label>
        <textarea
          value={flowDescription}
          onChange={(e) => setFlowDescription(e.target.value)}
          placeholder="ipfs://..."
        />
      </div>
      <button type="submit" disabled={isPending || !address}>
        {isPending ? 'Creating...' : 'Create RFQ'}
      </button>
    </form>
  )
}

