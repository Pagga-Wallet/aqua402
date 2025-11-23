import { makeAutoObservable } from 'mobx'

export interface Auction {
  id: string
  borrower: string
  amount: string
  duration: number
  endTime: number
  status: 'Open' | 'Finalized' | 'Settled' | 'Cancelled'
  createdAt: number
  bids: Bid[]
}

export interface Bid {
  lender: string
  rateBps: number
  limit: string
  timestamp: number
  isWinning: boolean
}

class AuctionStore {
  auctions: Auction[] = []
  selectedAuction: Auction | null = null
  loading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setAuctions(auctions: Auction[]) {
    this.auctions = auctions
  }

  setSelectedAuction(auction: Auction | null) {
    this.selectedAuction = auction
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setError(error: string | null) {
    this.error = error
  }

  addAuction(auction: Auction) {
    this.auctions.push(auction)
  }

  updateAuction(id: string, updates: Partial<Auction>) {
    const index = this.auctions.findIndex(a => a.id === id)
    if (index !== -1) {
      this.auctions[index] = { ...this.auctions[index], ...updates }
    }
  }

  addBid(auctionId: string, bid: Bid) {
    const auction = this.auctions.find(a => a.id === auctionId)
    if (auction) {
      auction.bids.push(bid)
    }
  }
}

export const auctionStore = new AuctionStore()

