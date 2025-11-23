import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { apiClient } from '../../lib/api/client'
import { rfqStore, RFQ } from '../../shared/stores/rfqStore'
import { QuoteForm } from './QuoteForm'

export const LenderDashboard = observer(() => {
  const { address } = useAccount()
  const [selectedRFQ, setSelectedRFQ] = useState<string | null>(null)

  useEffect(() => {
    const loadRFQs = async () => {
      rfqStore.setLoading(true)
      rfqStore.setError(null)
      try {
        const rfqs = await apiClient.listRFQs(100, 0) as any[]
        // Handle null or undefined response
        if (!rfqs || !Array.isArray(rfqs)) {
          rfqStore.setRFQs([])
          return
        }
        // Transform backend data to frontend format
        const transformedRFQs: RFQ[] = rfqs.map((r: any) => ({
          id: r.ID?.toString() || r.id?.toString() || '',
          borrower: r.BorrowerAddress || r.borrower_address || '',
          amount: r.Amount || r.amount || '',
          duration: Math.floor((r.Duration || r.duration || 0) / (24 * 60 * 60)), // Convert seconds to days
          collateralType: r.CollateralType || r.collateral_type || 0,
          flowDescription: r.FlowDescription || r.flow_description || '',
          status: (r.Status || r.status || 'Open') as 'Open' | 'Closed' | 'Executed' | 'Cancelled',
          createdAt: r.CreatedAt || r.created_at || Date.now() / 1000,
          quotes: [] // Load separately if needed
        }))
        rfqStore.setRFQs(transformedRFQs)
      } catch (error) {
        rfqStore.setError(error instanceof Error ? error.message : 'Failed to load RFQs')
        console.error('Failed to load RFQs:', error)
      } finally {
        rfqStore.setLoading(false)
      }
    }

    loadRFQs()
  }, [address])

  return (
    <div className="lender-dashboard">
      <h2>Lender Dashboard</h2>
      {address ? (
        <div>
          <p>Connected: {address}</p>
          <div>
            <h3>Open RFQs</h3>
            {rfqStore.loading ? (
              <p>Loading RFQs...</p>
            ) : rfqStore.error ? (
              <p style={{ color: 'red' }}>Error: {rfqStore.error}</p>
            ) : rfqStore.rfqs.length === 0 ? (
              <p>No open RFQs</p>
            ) : (
              rfqStore.rfqs
                .filter((rfq) => rfq.status === 'Open')
                .map((rfq) => (
                  <div key={rfq.id} className="rfq-item">
                    <p>Amount: {rfq.amount}</p>
                    <p>Duration: {rfq.duration} days</p>
                    <p>Quotes: {rfq.quotes.length}</p>
                    {selectedRFQ === rfq.id ? (
                      <div>
                        <QuoteForm
                          rfqId={rfq.id}
                          onSubmitted={() => setSelectedRFQ(null)}
                        />
                        <button onClick={() => setSelectedRFQ(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedRFQ(rfq.id)}>Submit Quote</button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      ) : (
        <p>Please connect your wallet</p>
      )}
    </div>
  )
})

