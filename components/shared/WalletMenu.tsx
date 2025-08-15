'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useDisconnect, useEnsName } from 'wagmi'
import { useRobotoTokensContext } from '../../contexts/RobotoTokensContext'
import { ChevronDown, ExternalLink, LogOut, Wallet, X, HelpCircle, Trophy } from 'lucide-react'
import { Button } from '../ui/button'
import { TutorialDialog } from './TutorialDialog'

export function WalletMenu() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { robotos, robopets } = useRobotoTokensContext()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Get ENS name
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    enabled: !!address,
  })
  
  // Check if mobile - after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Handle click outside to close dropdown (desktop only)
  useEffect(() => {
    if (!showDropdown || isMobile) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    
    // Small timeout to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 0)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [showDropdown, isMobile])
  
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && showDropdown) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, showDropdown])
  
  if (!address || !mounted) return null
  
  const addressShortened = address.slice(0, 6) + '...' + address.slice(-4)
  const displayName = ensName || addressShortened
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="terminal"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2"
      >
        <Wallet className="w-4 h-4" />
        <span className="font-mono">{displayName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </Button>
      
      {showDropdown && (
        isMobile ? (
          /* Mobile Full Screen Menu */
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-green-500/30">
              <h2 className="text-lg font-bold text-green-400">WALLET MENU</h2>
              <button
                onClick={() => setShowDropdown(false)}
                className="p-2 hover:bg-green-500/10 rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Wallet Address */}
              <div className="p-6 border-b border-green-500/30">
                <p className="text-sm text-green-400 mb-2">CONNECTED WALLET</p>
                <p className="font-mono text-green-500 break-all">
                  {ensName ? (
                    <>
                      <span className="text-green-300 text-lg">{ensName}</span>
                      <br />
                      <span className="text-sm text-green-500/70">{addressShortened}</span>
                    </>
                  ) : (
                    address
                  )}
                </p>
              </div>
              
              {/* Collection */}
              <div className="p-6 border-b border-green-500/30">
                <p className="text-sm text-green-400 mb-4">YOUR COLLECTION</p>
                <div className="space-y-3">
                  <a
                    href="https://opensea.io/collection/robotos-official"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between hover:bg-green-500/10 -mx-3 px-3 py-2 rounded transition-colors"
                  >
                    <span className="text-base">Robotos</span>
                    <span className="text-base font-mono text-green-400">{robotos.length}</span>
                  </a>
                  <a
                    href="https://opensea.io/collection/robopets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between hover:bg-green-500/10 -mx-3 px-3 py-2 rounded transition-colors"
                  >
                    <span className="text-base">Robopets</span>
                    <span className="text-base font-mono text-green-400">{robopets.length}</span>
                  </a>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-6">
                <Link
                  href="/leaderboard"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center justify-between w-full px-4 py-3 text-base hover:bg-green-500/10 rounded transition-colors mb-3"
                >
                  <span>Leaderboard</span>
                  <Trophy className="w-5 h-5 text-green-400" />
                </Link>
                
                <button
                  onClick={() => {
                    setShowTutorial(true)
                    setShowDropdown(false)
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 text-base hover:bg-green-500/10 rounded transition-colors mb-3"
                >
                  <span>Game Help</span>
                  <HelpCircle className="w-5 h-5 text-green-400" />
                </button>
                
                <a
                  href={`https://opensea.io/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 text-base hover:bg-green-500/10 rounded transition-colors mb-3"
                >
                  <span>View on OpenSea</span>
                  <ExternalLink className="w-5 h-5 text-green-400" />
                </a>
                
                <button
                  onClick={() => {
                    disconnect()
                    setShowDropdown(false)
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 text-base text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <span>Disconnect</span>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Dropdown */
          <div className="absolute top-full right-0 mt-2 w-64 bg-black/95 border-2 border-green-500 rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
            {/* Wallet Address */}
            <div className="p-4 border-b border-green-500/30">
              <p className="text-xs text-green-400 mb-1">Connected Wallet</p>
              <p className="font-mono text-sm text-green-500 break-all">
                {ensName ? (
                  <>
                    <span className="text-green-300">{ensName}</span>
                    <br />
                    <span className="text-xs text-green-500/70">{addressShortened}</span>
                  </>
                ) : (
                  address
                )}
              </p>
            </div>
            
            {/* Collection */}
            <div className="p-4 border-b border-green-500/30">
              <p className="text-xs text-green-400 mb-2">YOUR COLLECTION</p>
              <div className="space-y-2">
                <a
                  href="https://opensea.io/collection/robotos-official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between hover:bg-green-500/10 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <span className="text-sm">Robotos</span>
                  <span className="text-sm font-mono text-green-400">{robotos.length}</span>
                </a>
                <a
                  href="https://opensea.io/collection/robopets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between hover:bg-green-500/10 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <span className="text-sm">Robopets</span>
                  <span className="text-sm font-mono text-green-400">{robopets.length}</span>
                </a>
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-2">
              <Link
                href="/leaderboard"
                onClick={() => setShowDropdown(false)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-green-500/10 rounded transition-colors"
              >
                <span>Leaderboard</span>
                <Trophy className="w-4 h-4 text-green-400" />
              </Link>
              
              <button
                onClick={() => {
                  setShowTutorial(true)
                  setShowDropdown(false)
                }}
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-green-500/10 rounded transition-colors mt-1"
              >
                <span>Game Help</span>
                <HelpCircle className="w-4 h-4 text-green-400" />
              </button>
              
              <a
                href={`https://opensea.io/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-green-500/10 rounded transition-colors mt-1"
              >
                <span>View on OpenSea</span>
                <ExternalLink className="w-4 h-4 text-green-400" />
              </a>
              
              <button
                onClick={() => {
                  disconnect()
                  setShowDropdown(false)
                }}
                className="flex items-center justify-between w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors mt-1"
              >
                <span>Disconnect</span>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      )}
      
      {/* Tutorial Dialog - controlled by state */}
      <TutorialDialog 
        open={showTutorial} 
        onOpenChange={setShowTutorial}
      />
    </div>
  )
}