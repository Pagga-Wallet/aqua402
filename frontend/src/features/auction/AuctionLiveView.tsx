import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useWebSocket } from '../../shared/hooks/useWebSocket'
import { auctionStore } from '../../shared/stores/auctionStore'
import { BidForm } from './BidForm'
import { CreateAuctionForm } from './CreateAuctionForm'

export const AuctionLiveView = observer(() => {
  const { address } = useAccount()
  const [auctionId, setAuctionId] = useState<string>('')
  
  const wsUrl = auctionId ? `ws://localhost:8080/ws/auction/${auctionId}` : ''
  const { messages, connected } = useWebSocket(wsUrl, auctionId ? [`auction:${auctionId}`] : [])
  
  // Update store with WebSocket messages
  messages.forEach((msg) => {
    if (msg.type === 'bid_placed' && auctionId) {
      auctionStore.addBid(auctionId, msg.payload)
    }
  })
  
  const auction = auctionStore.auctions.find(a => a.id === auctionId)
  const bids = auction?.bids || []

  return (
    <div className="auction-live-view">
      <h2>Auction Live View</h2>
      {address && <CreateAuctionForm />}
      <div>
        <h3>View Auction</h3>
        <input
          type="text"
          placeholder="Auction ID"
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
        />
        {connected && <span className="status-connected">Connected</span>}
      </div>
      {auctionId && (
        <div>
          {auction && (
            <>
              <div className="auction-info">
                <p>Amount: {auction.amount}</p>
                <p>Duration: {auction.duration} days</p>
                <p>Status: {auction.status}</p>
                <p>End Time: {new Date(auction.endTime * 1000).toLocaleString()}</p>
              </div>
              {auction.status === 'Open' && address && (
                <BidForm auctionId={auctionId} />
              )}
            </>
          )}
          <div>
            <h3>Bids ({bids.length})</h3>
            {bids.length === 0 ? (
              <p>No bids yet</p>
            ) : (
              bids
                .sort((a, b) => a.rateBps - b.rateBps)
                .map((bid, index) => (
                  <div key={index} className={`bid-item ${bid.isWinning ? 'winning' : ''}`}>
                    <p>Lender: {bid.lender}</p>
                    <p>Rate: {bid.rateBps} bps</p>
                    <p>Limit: {bid.limit}</p>
                    <p>Time: {new Date(bid.timestamp * 1000).toLocaleString()}</p>
                    {bid.isWinning && <span className="badge-winning">Winning</span>}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  )
})

