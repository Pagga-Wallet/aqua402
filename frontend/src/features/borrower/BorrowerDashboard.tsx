import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { apiClient } from '../../lib/api/client'
import { rfqStore, RFQ } from '../../shared/stores/rfqStore'
import { CreateRFQForm } from './CreateRFQForm'

export const BorrowerDashboard = observer(() => {
  const { address } = useAccount()

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
    <div className="borrower-dashboard">
      <h2>Borrower Dashboard</h2>
      {address ? (
        <div>
          <p>Connected: {address}</p>
          <CreateRFQForm />
          <div>
            <h3>My RFQs</h3>
            {rfqStore.loading ? (
              <p>Loading RFQs...</p>
            ) : rfqStore.error ? (
              <p style={{ color: 'red' }}>Error: {rfqStore.error}</p>
            ) : rfqStore.rfqs.length === 0 ? (
              <p>No RFQs created yet</p>
            ) : (
              rfqStore.rfqs.map((rfq) => (
                <div key={rfq.id} className="rfq-item">
                  <p>Amount: {rfq.amount}</p>
                  <p>Duration: {rfq.duration} days</p>
                  <p>Status: {rfq.status}</p>
                  <p>Quotes: {rfq.quotes.length}</p>
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

