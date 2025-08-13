'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { HelpCircle, Sword, Sparkles, Zap, Shield, Clock, Target, Gauge } from 'lucide-react'
import { cn } from '../../lib/utils'
import { gameSounds } from '../../lib/sounds/gameSounds'

interface TutorialSection {
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

interface TutorialDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showButton?: boolean
}

export function TutorialDialog({ open: controlledOpen, onOpenChange, showButton = false }: TutorialDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  // Check if user has seen tutorial before (only if not controlled)
  useEffect(() => {
    if (controlledOpen !== undefined) return // Skip auto-show if controlled
    
    const seen = localStorage.getItem('roboto_rumble_tutorial_seen')
    if (!seen) {
      // Show tutorial on first visit
      setTimeout(() => setInternalOpen(true), 1000)
    } else {
      setHasSeenTutorial(true)
    }
  }, [controlledOpen])

  // Mark tutorial as seen when closed
  const handleClose = () => {
    localStorage.setItem('roboto_rumble_tutorial_seen', 'true')
    setHasSeenTutorial(true)
    setOpen(false)
  }

  const sections: TutorialSection[] = [
    {
      title: 'HOW TO PLAY',
      icon: <Sword className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-green-300 font-medium">
            Welcome to Roboto Rumble!
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="text-2xl">⚡</div>
              <div>
                <p className="text-green-400 font-medium mb-1">Speed determines turn order</p>
                <p className="text-sm text-gray-400">Faster Robotos act first</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-2xl">⚔️</div>
              <div>
                <p className="text-green-400 font-medium mb-1">Choose your attack</p>
                <p className="text-sm text-gray-400">Basic attacks or special abilities</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-2xl">🏆</div>
              <div>
                <p className="text-green-400 font-medium mb-1">Last team standing wins</p>
                <p className="text-sm text-gray-400">Defeat all enemy units</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300">
              💡 <span className="font-medium">Pro tip:</span> Your NFT traits = your battle abilities!
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'ATTACKS',
      icon: <Sparkles className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div className="grid gap-6">
            <div className="flex gap-4 p-4 bg-orange-900/10 rounded-lg border border-orange-500/20">
              <div className="text-2xl">⚔️</div>
              <div className="flex-1">
                <p className="text-orange-400 font-medium text-lg mb-2">Basic Attack</p>
                <p className="text-gray-400">Always ready • No energy cost</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 bg-purple-900/10 rounded-lg border border-purple-500/20">
              <div className="text-2xl">✨</div>
              <div className="flex-1">
                <p className="text-purple-400 font-medium text-lg mb-2">Special Abilities</p>
                <p className="text-gray-400">Powerful moves • Uses energy</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 font-medium mb-2">⏰ Cooldowns</p>
            <p className="text-sm text-gray-400">
              Special abilities need 1 turn to recharge after use
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'ELEMENT SYSTEM',
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-green-300 font-medium">
            Elements determine type advantages!
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-3 p-3 bg-gradient-to-r from-red-900/20 to-red-800/10 rounded-lg border border-red-500/20">
              <div className="text-2xl">⚡</div>
              <div>
                <p className="text-red-400 font-medium">SURGE</p>
                <p className="text-xs text-gray-500">Electric type</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-gradient-to-r from-gray-900/20 to-gray-800/10 rounded-lg border border-gray-500/20">
              <div className="text-2xl">⚙️</div>
              <div>
                <p className="text-gray-400 font-medium">METAL</p>
                <p className="text-xs text-gray-500">Steel type</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-lg border border-blue-500/20">
              <div className="text-2xl">💻</div>
              <div>
                <p className="text-blue-400 font-medium">CODE</p>
                <p className="text-xs text-gray-500">Digital type</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-gradient-to-r from-purple-900/20 to-purple-800/10 rounded-lg border border-purple-500/20">
              <div className="text-2xl">🔮</div>
              <div>
                <p className="text-purple-400 font-medium">GLITCH</p>
                <p className="text-xs text-gray-500">Chaos type</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-gradient-to-r from-pink-900/20 to-pink-800/10 rounded-lg border border-pink-500/20">
              <div className="text-2xl">❤️</div>
              <div>
                <p className="text-pink-400 font-medium">BOND</p>
                <p className="text-xs text-gray-500">Robopet only</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-500/20">
              <div className="text-2xl">🌿</div>
              <div>
                <p className="text-green-400 font-medium">WILD</p>
                <p className="text-xs text-gray-500">Robopet only</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 font-medium mb-3 flex items-center gap-2">
              <span className="text-xl">🎯</span> Type Advantage Chart
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚡ SURGE</span>
                <span className="text-gray-500">→</span>
                <span className="text-gray-400">⚙️ METAL</span>
                <span className="text-green-400 text-xs ml-auto">+50% damage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⚙️ METAL</span>
                <span className="text-gray-500">→</span>
                <span className="text-blue-400">💻 CODE</span>
                <span className="text-green-400 text-xs ml-auto">+50% damage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">💻 CODE</span>
                <span className="text-gray-500">→</span>
                <span className="text-purple-400">🔮 GLITCH</span>
                <span className="text-green-400 text-xs ml-auto">+50% damage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">🔮 GLITCH</span>
                <span className="text-gray-500">→</span>
                <span className="text-red-400">⚡ SURGE</span>
                <span className="text-green-400 text-xs ml-auto">+50% damage</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'TIMING MINI-GAMES',
      icon: <Gauge className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-green-300 font-medium">
            Perfect your timing for massive damage!
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-500/20">
              <div className="text-2xl">🎯</div>
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-1">Precision Meter</p>
                <p className="text-sm text-gray-400">Click when the bar hits green for max damage</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-800/10 rounded-lg border border-yellow-500/20">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <p className="text-yellow-400 font-medium mb-1">Charge Attack</p>
                <p className="text-sm text-gray-400">Mash SPACE or ENTER to power up!</p>
                <p className="text-xs text-yellow-500/60 mt-2">Tip: Faster tapping = more power</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-gradient-to-r from-purple-900/20 to-pink-800/10 rounded-lg border border-purple-500/20">
              <div className="text-2xl">🎰</div>
              <div className="flex-1">
                <p className="text-purple-400 font-medium mb-1">Spinner</p>
                <p className="text-sm text-gray-400">Hit the sweet spots as it spins!</p>
                <p className="text-xs text-purple-500/60 mt-2">Multiple hits = combo bonus</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-cyan-300">
              💪 <span className="font-medium">Damage Range:</span> 0.5x (miss) → 2.0x (perfect)
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'TURN SYSTEM',
      icon: <Clock className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-green-300 font-medium">
            Speed determines who goes first!
          </p>
          
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="text-xl mt-1">1️⃣</div>
              <div>
                <p className="text-green-400 font-medium">Speed Check</p>
                <p className="text-sm text-gray-400">Fastest Roboto acts first each round</p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <div className="text-xl mt-1">2️⃣</div>
              <div>
                <p className="text-green-400 font-medium">Choose Action</p>
                <p className="text-sm text-gray-400">Pick attack or ability when it&apos;s your turn</p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <div className="text-xl mt-1">3️⃣</div>
              <div>
                <p className="text-green-400 font-medium">Timer Countdown</p>
                <p className="text-sm text-gray-400">5 seconds (Speedy) or 10 seconds (Calm)</p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <div className="text-xl mt-1">4️⃣</div>
              <div>
                <p className="text-green-400 font-medium">Auto-Attack</p>
                <p className="text-sm text-gray-400">Basic attack triggers if time runs out</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-lg">
            <p className="text-orange-300 font-medium mb-2 flex items-center gap-2">
              <span className="text-xl">🛡️</span> Defense Timing
            </p>
            <p className="text-sm text-gray-400">
              Time your blocks when enemies attack for reduced damage!
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'STATS EXPLAINED',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <p className="text-lg text-green-300 font-medium">
            Your NFT traits = Your battle power!
          </p>
          
          <div className="space-y-3">
            <div className="flex gap-4 p-3 bg-gradient-to-r from-red-900/20 to-red-800/10 rounded-lg border border-red-500/20">
              <div className="text-2xl">❤️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium">HP (Health)</p>
                <p className="text-sm text-gray-400">How much damage you can take</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-3 bg-gradient-to-r from-orange-900/20 to-orange-800/10 rounded-lg border border-orange-500/20">
              <div className="text-2xl">⚔️</div>
              <div className="flex-1">
                <p className="text-orange-400 font-medium">ATTACK</p>
                <p className="text-sm text-gray-400">Your damage output</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-3 bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-lg border border-blue-500/20">
              <div className="text-2xl">🛡️</div>
              <div className="flex-1">
                <p className="text-blue-400 font-medium">DEFENSE</p>
                <p className="text-sm text-gray-400">Reduces incoming damage</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-3 bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 rounded-lg border border-yellow-500/20">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">SPEED</p>
                <p className="text-sm text-gray-400">Who goes first in battle</p>
              </div>
            </div>
            
            <div className="flex gap-4 p-3 bg-gradient-to-r from-purple-900/20 to-purple-800/10 rounded-lg border border-purple-500/20">
              <div className="text-2xl">✨</div>
              <div className="flex-1">
                <p className="text-purple-400 font-medium">ENERGY</p>
                <p className="text-sm text-gray-400">Powers special abilities</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-300">
              🎲 <span className="font-medium">Pro tip:</span> Each NFT trait affects your stats differently!
            </p>
          </div>
        </div>
      )
    }
  ]

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
      gameSounds.play('menuNavigate')
    }
  }

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
      gameSounds.play('menuNavigate')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showButton && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-green-500/50 hover:border-green-500"
            onClick={() => gameSounds.playClick()}
          >
            <HelpCircle className="w-4 h-4" />
            HELP
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden bg-black/95 border-green-500">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-green-400">
            {sections[currentSection].icon}
            {sections[currentSection].title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[50vh] pr-2">
          {sections[currentSection].content}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-green-500/30">
          <div className="flex gap-1">
            {sections.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentSection 
                    ? "bg-green-400 w-6" 
                    : "bg-green-600/50 hover:bg-green-600"
                )}
                onClick={() => {
                  setCurrentSection(index)
                  gameSounds.play('menuNavigate')
                }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSection}
              disabled={currentSection === 0}
              className="border-green-500/50"
            >
              PREV
            </Button>
            {currentSection === sections.length - 1 ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleClose}
                className="bg-green-600 hover:bg-green-700"
              >
                GOT IT!
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={nextSection}
                className="bg-green-600 hover:bg-green-700"
              >
                NEXT
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}