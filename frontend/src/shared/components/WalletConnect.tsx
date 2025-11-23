import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'

export const WalletConnect = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div className="wallet-connect">
        <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div className="wallet-connect">
      <h3>Connect Wallet</h3>
      <div>
        <button onClick={() => connect({ connector: metaMask() })}>
          MetaMask
        </button>
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
          >
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  )
}

