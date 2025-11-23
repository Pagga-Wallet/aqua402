import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { wagmiConfig } from './lib/evm/wagmi'
import { WalletConnect } from './shared/components/WalletConnect'
import { Faucet } from './shared/components/Faucet'
import { BorrowerDashboard } from './features/borrower/BorrowerDashboard'
import { LenderDashboard } from './features/lender/LenderDashboard'
import { AuctionLiveView } from './features/auction/AuctionLiveView'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="App">
            <header>
              <h1>Aqua x402 Finance Layer</h1>
              <WalletConnect />
              <Faucet />
            </header>
            <nav>
              <Link to="/borrower">Borrower</Link>
              <Link to="/lender">Lender</Link>
              <Link to="/auction">Auction</Link>
            </nav>
            <main>
              <Routes>
                <Route path="/" element={<BorrowerDashboard />} />
                <Route path="/borrower" element={<BorrowerDashboard />} />
                <Route path="/lender" element={<LenderDashboard />} />
                <Route path="/auction" element={<AuctionLiveView />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
