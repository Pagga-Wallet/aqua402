import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { apiClient } from '../../lib/api/client'
import { useWebSocket } from '../../shared/hooks/useWebSocket'
import { auctionStore, Auction } from '../../shared/stores/auctionStore'
import { BidForm } from './BidForm'
import { CreateAuctionForm } from './CreateAuctionForm'

export const AuctionLiveView = observer(() => {
  const { address } = useAccount()
  const [auctionId, setAuctionId] = useState<string>('')
  
  // Build WebSocket URL from VITE_API_URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  const wsProtocol = apiUrl.startsWith('https://') ? 'wss://' : 'ws://'
  // Extract host from API URL (remove protocol)
  let wsHost = apiUrl.replace(/^https?:\/\//, '') // Remove protocol
  wsHost = wsHost.split('/')[0] // Get only hostname (remove any path)
  // WebSocket is now in /api/v1/ws/auction/:id
  const wsUrl = auctionId ? `${wsProtocol}${wsHost}/api/v1/ws/auction/${auctionId}` : ''
  const { messages, connected } = useWebSocket(wsUrl, auctionId ? [`auction:${auctionId}`] : [])

  useEffect(() => {
    const loadAuctions = async () => {
      auctionStore.setLoading(true)
      auctionStore.setError(null)
      try {
        const auctions = await apiClient.listAuctions(100, 0) as any[]
        // Handle null or undefined response
        if (!auctions || !Array.isArray(auctions)) {
          auctionStore.setAuctions([])
          return
        }
        // Transform backend data to frontend format
        const transformedAuctions: Auction[] = auctions.map((a: any) => ({
          id: a.ID?.toString() || a.id?.toString() || '',
          borrower: a.BorrowerAddress || a.borrower_address || '',
          amount: a.Amount || a.amount || '',
          duration: Math.floor((a.Duration || a.duration || 0) / (24 * 60 * 60)), // Convert seconds to days
          endTime: a.EndTime || a.end_time || a.CreatedAt + (a.Duration || a.duration || 0),
          status: (a.Status || a.status || 'Open') as 'Open' | 'Finalized' | 'Settled' | 'Cancelled',
          createdAt: a.CreatedAt || a.created_at || Date.now() / 1000,
          bids: [] // Load separately if needed
        }))
        auctionStore.setAuctions(transformedAuctions)
      } catch (error) {
        auctionStore.setError(error instanceof Error ? error.message : 'Failed to load auctions')
        console.error('Failed to load auctions:', error)
      } finally {
        auctionStore.setLoading(false)
      }
    }

    loadAuctions()
  }, [address])
  
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
        <h3>Available Auctions</h3>
        {auctionStore.loading ? (
          <p>Loading auctions...</p>
        ) : auctionStore.error ? (
          <p style={{ color: 'red' }}>Error: {auctionStore.error}</p>
        ) : auctionStore.auctions.length === 0 ? (
          <p>No auctions available</p>
        ) : (
          <div>
            {auctionStore.auctions.map((a) => (
              <div key={a.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
                <p><strong>Auction ID:</strong> {a.id}</p>
                <p><strong>Amount:</strong> {a.amount} ETH</p>
                <p><strong>Duration:</strong> {a.duration} days</p>
                <p><strong>Status:</strong> {a.status}</p>
                <button onClick={() => setAuctionId(a.id)}>View Details</button>
              </div>
            ))}
          </div>
        )}
      </div>

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
          {auction ? (
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
          ) : (
            <p>Auction not found</p>
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

