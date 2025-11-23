import { observer } from 'mobx-react-lite'
import { useAccount } from 'wagmi'
import { rfqStore } from '../../shared/stores/rfqStore'
import { CreateRFQForm } from './CreateRFQForm'

export const BorrowerDashboard = observer(() => {
  const { address } = useAccount()

  return (
    <div className="borrower-dashboard">
      <h2>Borrower Dashboard</h2>
      {address ? (
        <div>
          <p>Connected: {address}</p>
          <CreateRFQForm />
          <div>
            <h3>My RFQs</h3>
            {rfqStore.rfqs.length === 0 ? (
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

