import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../../lib/evm/contracts'
import { RFQ_ABI } from '../../lib/evm/abis'
import { parseEther } from 'viem'

export const CreateRFQForm = () => {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [collateralType, setCollateralType] = useState('0')
  const [flowDescription, setFlowDescription] = useState('')
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

    if (!CONTRACT_ADDRESSES.rfq) {
      setError('RFQ contract address not configured')
      return
    }

    setError(null)
    setTxHash(undefined)

    try {
      const durationSeconds = parseInt(duration) * 24 * 60 * 60
      
      const hash = await writeContract({
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

      setTxHash(hash)
      console.log('RFQ transaction sent:', hash)
      
      // Reset form after successful transaction
      if (isConfirmed) {
        setAmount('')
        setDuration('')
        setCollateralType('0')
        setFlowDescription('')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create RFQ'
      console.error('Failed to create RFQ:', err)
      setError(errorMessage)
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
      <button type="submit" disabled={isPending || isConfirming || !address}>
        {isPending ? 'Creating...' : isConfirming ? 'Waiting for confirmation...' : 'Create RFQ'}
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

