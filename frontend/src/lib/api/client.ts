const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return response.json()
  }

  // RFQ endpoints
  async createRFQ(data: {
    borrower_address: string
    amount: string
    duration: number
    collateral_type: number
    flow_description: string
  }) {
    return this.request('/api/v1/rfq', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getRFQ(id: string) {
    return this.request(`/api/v1/rfq/${id}`)
  }

  async submitQuote(rfqId: string, data: {
    lender_address: string
    rate_bps: number
    limit: string
    collateral_required: string
  }) {
    return this.request(`/api/v1/rfq/${rfqId}/quote`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Auction endpoints
  async createAuction(data: {
    borrower_address: string
    amount: string
    duration: number
    bidding_duration: number
  }) {
    return this.request('/api/v1/auction', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async placeBid(auctionId: string, data: {
    lender_address: string
    rate_bps: number
    limit: string
  }) {
    return this.request(`/api/v1/auction/${auctionId}/bid`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Aqua endpoints
  async connectLiquidity(data: {
    lender_address: string
    amount: string
    token_address: string
  }) {
    return this.request('/api/v1/aqua/liquidity', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getAvailableLiquidity(address: string) {
    return this.request(`/api/v1/aqua/liquidity/${address}`)
  }
}

export const apiClient = new APIClient()

