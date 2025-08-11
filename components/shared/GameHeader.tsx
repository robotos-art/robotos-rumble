'use client'

import Link from 'next/link'
import { Button } from '../ui/button'
import { ArrowLeft } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { SoundToggle } from './SoundToggle'
import { WalletMenu } from './WalletMenu'
import { BackgroundSelector } from './BackgroundSelector'
import { useAccount } from 'wagmi'
import { cn } from '../../lib/utils'

interface GameHeaderProps {
  title?: string
  backHref?: string
  showBackButton?: boolean
  showSoundToggle?: boolean
  showWallet?: boolean
  showBackgroundSelector?: boolean
  className?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
}

export function GameHeader({
  title,
  backHref = '/',
  showBackButton = false,
  showSoundToggle = true,
  showWallet = true,
  showBackgroundSelector = false,
  className,
  leftContent,
  rightContent
}: GameHeaderProps) {
  const { isConnected } = useAccount()

  return (
    <header className={cn(
      "flex items-center justify-between",
      "px-4 md:px-8",
      "py-4 md:py-6",
      className
    )}>
      {/* Left section */}
      <div className="flex items-center gap-3">
        {showBackButton && backHref && (
          <Link href={backHref}>
            <Button 
              variant="terminal" 
              size="icon"
              onClick={() => gameSounds.playClick()}
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        )}
        {title && (
          <h1 className="text-2xl md:text-3xl font-bold text-green-400 glow">
            {title}
          </h1>
        )}
        {leftContent}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {rightContent}
        {showBackgroundSelector && <BackgroundSelector />}
        {showSoundToggle && <SoundToggle />}
        {showWallet && isConnected && <WalletMenu />}
      </div>
    </header>
  )
}