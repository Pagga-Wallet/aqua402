import { makeAutoObservable } from 'mobx'

export interface RFQ {
  id: string
  borrower: string
  amount: string
  duration: number
  collateralType: number
  flowDescription: string
  status: 'Open' | 'Closed' | 'Executed' | 'Cancelled'
  createdAt: number
  quotes: Quote[]
}

export interface Quote {
  lender: string
  rateBps: number
  limit: string
  collateralRequired: string
  submittedAt: number
  accepted: boolean
}

class RFQStore {
  rfqs: RFQ[] = []
  selectedRFQ: RFQ | null = null
  loading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setRFQs(rfqs: RFQ[]) {
    this.rfqs = rfqs
  }

  setSelectedRFQ(rfq: RFQ | null) {
    this.selectedRFQ = rfq
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setError(error: string | null) {
    this.error = error
  }

  addRFQ(rfq: RFQ) {
    this.rfqs.push(rfq)
  }

  updateRFQ(id: string, updates: Partial<RFQ>) {
    const index = this.rfqs.findIndex(r => r.id === id)
    if (index !== -1) {
      this.rfqs[index] = { ...this.rfqs[index], ...updates }
    }
  }
}

export const rfqStore = new RFQStore()

