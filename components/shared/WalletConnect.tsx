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
      <Button variant="terminal" disabled className="gap-2 group">
        <Wallet className="w-4 h-4 text-green-500/60" />
        <span className="text-green-500/60">LOADING...</span>
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
      className="gap-2 group"
    >
      <Wallet className="w-4 h-4 text-green-500/60 group-hover:text-green-400 transition-colors" />
      <span className="text-green-500/60 group-hover:text-green-400 transition-colors">CONNECT</span>
    </Button>
  )
}