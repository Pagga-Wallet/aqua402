import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { rfqStore } from '../../shared/stores/rfqStore'
import { QuoteForm } from './QuoteForm'

export const LenderDashboard = observer(() => {
  const { address } = useAccount()
  const [selectedRFQ, setSelectedRFQ] = useState<string | null>(null)

  return (
    <div className="lender-dashboard">
      <h2>Lender Dashboard</h2>
      {address ? (
        <div>
          <p>Connected: {address}</p>
          <div>
            <h3>Open RFQs</h3>
            {rfqStore.rfqs.length === 0 ? (
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

