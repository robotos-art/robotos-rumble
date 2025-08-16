'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '../components/ui/button'
import { Swords, Trophy, Users } from 'lucide-react'
import { gameSounds } from '../lib/sounds/gameSounds'
import FuzzyText from '../components/ui/FuzzyText'
import { GameHeader } from '../components/shared/GameHeader'
import { PageLayout } from '../components/shared/PageLayout'
import { useAccount } from 'wagmi'

export default function Home() {
  const [bootText, setBootText] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const { isConnected } = useAccount()

  useEffect(() => {
    const fullText = `ROBOTO RUMBLE v1.0.0
INITIALIZING COMBAT PROTOCOLS...
LOADING ANCIENT BATTLE SYSTEMS...
SYNCHRONIZING TRAIT MATRICES...

[OK] SYSTEM READY

PRESS ANY KEY TO CONTINUE`

    let index = 0
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setBootText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
        setTimeout(() => setShowMenu(true), 500)
      }
    }, 20)

    // Skip boot sequence on click/key press
    const skipBoot = () => {
      clearInterval(interval)
      setShowMenu(true)
      gameSounds.playClick()
    }

    document.addEventListener('click', skipBoot)
    document.addEventListener('keydown', skipBoot)

    return () => {
      clearInterval(interval)
      document.removeEventListener('click', skipBoot)
      document.removeEventListener('keydown', skipBoot)
    }
  }, [])

  if (!showMenu) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <pre className="text-green-500 glow-sm whitespace-pre font-mono text-sm leading-relaxed">
            {bootText}
            <span className="terminal-cursor" />
          </pre>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Full width header */}
      <GameHeader />

      {/* Constrained content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-6 flex-1 flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo with FuzzyText */}
          <div className="mb-8 flex justify-center w-full" style={{
            perspective: '300px',
          }}>
            <div className="flex flex-col items-center" style={{
              transform: 'rotateX(30deg)',
              transformOrigin: 'center top',
            }}>
              <div className="mb-4 flex justify-center">
                <div>
                  <FuzzyText
                    fontSize="clamp(2.5rem, 7vw, 5rem)"
                    fontWeight={400}
                    fontFamily="Space Mono, monospace"
                    color="#86efac"
                    baseIntensity={0.1}
                    hoverIntensity={0.4}
                    enableHover={true}
                  >
                    ROBOTOS
                  </FuzzyText>
                </div>
              </div>
              <div className="flex justify-center">
                <div style={{
                  letterSpacing: '-0.05em',
                }}>
                  <FuzzyText
                    fontSize="clamp(3rem, 10vw, 10rem)"
                    fontWeight={900}
                    fontFamily="Space Mono, monospace"
                    color="#22c55e"
                    baseIntensity={0.2}
                    hoverIntensity={0.8}
                    enableHover={true}
                  >
                    RUMBLE
                  </FuzzyText>
                </div>
              </div>
            </div>
          </div>

          <p className="text-green-400 text-lg mb-12">
            ANCIENT COMBAT PROTOCOL v1.0
          </p>

          {/* Main Menu Buttons */}
          <div className="space-y-4">
            <Link href="/battle">
              <Button
                variant="terminal"
                size="lg"
                className="w-full max-w-sm mx-auto text-xl py-6 gap-3"
                onClick={() => gameSounds.playConfirm()}
                onMouseEnter={() => gameSounds.playHover()}
              >
                <Swords className="w-6 h-6" />
                BATTLE
              </Button>
            </Link>

            <Button
              variant="terminal"
              size="lg"
              className="w-full max-w-sm mx-auto text-xl py-6 gap-3 opacity-50 cursor-not-allowed"
              disabled
              onMouseEnter={() => gameSounds.playHover()}
            >
              <Trophy className="w-6 h-6" />
              TOURNAMENT
              <span className="text-sm ml-2">[SOON]</span>
            </Button>

            <Link href="/leaderboard">
              <Button
                variant="terminal"
                size="lg"
                className="w-full max-w-sm mx-auto text-xl py-6 gap-3"
                onClick={() => gameSounds.playConfirm()}
                onMouseEnter={() => gameSounds.playHover()}
              >
                <Users className="w-6 h-6" />
                LEADERBOARD
              </Button>
            </Link>
          </div>

          {/* Status */}
          <div className="mt-12 text-green-400/60 text-sm space-y-1">
            <p>SYSTEM STATUS: OPERATIONAL</p>
            <p className={isConnected ? 'text-green-400' : ''}>
              WALLET: {isConnected ? 'CONNECTED' : 'NOT CONNECTED'}
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}