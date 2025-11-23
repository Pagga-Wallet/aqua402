import { ethers } from 'ethers'
import { RFQ_ABI, AUCTION_ABI, AQUA_ABI, AGENT_FINANCE_ABI } from './abis'

export interface ContractAddresses {
  rfq: string
  auction: string
  aqua: string
  agentFinance: string
  x402Credit: string
}

export function getRFQContract(address: string, signer: ethers.Signer) {
  return new ethers.Contract(address, RFQ_ABI, signer)
}

export function getAuctionContract(address: string, signer: ethers.Signer) {
  return new ethers.Contract(address, AUCTION_ABI, signer)
}

export function getAquaContract(address: string, signer: ethers.Signer) {
  return new ethers.Contract(address, AQUA_ABI, signer)
}

export function getAgentFinanceContract(address: string, signer: ethers.Signer) {
  return new ethers.Contract(address, AGENT_FINANCE_ABI, signer)
}

// Contract addresses (will be set after deployment)
export const CONTRACT_ADDRESSES: ContractAddresses = {
  rfq: import.meta.env.VITE_RFQ_ADDRESS || '',
  auction: import.meta.env.VITE_AUCTION_ADDRESS || '',
  aqua: import.meta.env.VITE_AQUA_ADDRESS || '',
  agentFinance: import.meta.env.VITE_AGENT_FINANCE_ADDRESS || '',
  x402Credit: import.meta.env.VITE_X402_CREDIT_ADDRESS || '',
}

