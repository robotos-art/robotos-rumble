'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { Button } from '../ui/button'
import { Wallet } from 'lucide-react'
import { WalletMenu } from './WalletMenu'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [mounted, setMounted] = useState(false)

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="terminal" disabled className="gap-2">
        <Wallet className="w-4 h-4" />
        LOADING...
      </Button>
    )
  }
  
  if (isConnected && address) {
    return <WalletMenu />
  }
  
  // Connect with the first available connector (usually MetaMask)
  const handleConnect = () => {
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }

  return (
    <Button
      variant="terminal"
      onClick={handleConnect}
      className="gap-2"
    >
      <Wallet className="w-4 h-4" />
      CONNECT
    </Button>
  )
}