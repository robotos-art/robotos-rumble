'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '../ui/button'
import { ArrowLeft, Zap, Swords } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { SoundToggle } from './SoundToggle'
import { WalletConnect } from './WalletConnect'
import { BackgroundSelector } from './BackgroundSelector'
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
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  const isBattlePage = pathname?.startsWith('/battle')
  const isTeamBuilderPage = pathname === '/team-builder'
  
  return (
    <header className={cn(
      "flex items-center justify-between",
      "px-4 md:px-8",
      "py-4 md:py-6",
      className
    )}>
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Home Logo - always visible except on home page */}
        {!isHomePage && (
          <Link href="/">
            <Button 
              variant="terminal" 
              size="icon"
              onClick={() => gameSounds.playClick()}
              title="Home"
              className="relative group"
            >
              <Zap className="w-5 h-5 text-green-400 group-hover:animate-pulse" />
              <div className="absolute inset-0 bg-green-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </Link>
        )}
        
        {/* Back button - only show if not going back to home */}
        {showBackButton && backHref && backHref !== '/' && (
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
        {/* Battle button - show when not on battle/team-builder pages */}
        {!isBattlePage && !isTeamBuilderPage && !isHomePage && (
          <Link href="/battle">
            <Button 
              variant="terminal" 
              size="icon"
              onClick={() => gameSounds.playClick()}
              title="Start Battle"
              className="relative group"
            >
              <Swords className="w-5 h-5 text-green-400 group-hover:animate-pulse" />
              <div className="absolute inset-0 bg-green-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </Link>
        )}
        {showBackgroundSelector && <BackgroundSelector />}
        {showSoundToggle && <SoundToggle />}
        {showWallet && <WalletConnect />}
      </div>
    </header>
  )
}