'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { gameSounds } from '../../lib/sounds/gameSounds'

interface TimingMeterChargeProps {
  active: boolean
  onInput: (score: number) => void
  showCountdown?: boolean
  countdown?: number
  disabled?: boolean
  className?: string
  keepVisibleAfterInput?: boolean
}

export default function TimingMeterCharge({
  active,
  onInput,
  showCountdown = false,
  countdown = 3,
  disabled = false,
  className,
  keepVisibleAfterInput = false
}: TimingMeterChargeProps) {
  const [chargeLevel, setChargeLevel] = useState(0)
  const [hasInput, setHasInput] = useState(false)
  const [score, setScore] = useState(0)
  const [pressCount, setPressCount] = useState(0)
  const [lastPressTime, setLastPressTime] = useState(0)
  const [resistanceMultiplier, setResistanceMultiplier] = useState(1.0)
  const [isKeyDown, setIsKeyDown] = useState(false)

  // Reset only when becoming active with no input
  useEffect(() => {
    if (active && !hasInput) {
      setChargeLevel(0)
      setPressCount(0)
      setHasInput(false)
      setScore(0)
      setLastPressTime(Date.now())
      setIsKeyDown(false)
      // Randomize resistance: 0.7x to 1.3x (harder or easier to charge)
      const newResistance = 0.7 + Math.random() * 0.6
      setResistanceMultiplier(newResistance)
      console.log(`Charge resistance: ${(newResistance * 100).toFixed(0)}% (${newResistance < 1 ? 'easier' : 'harder'})`)
    }
    // Don't reset when active becomes false - keep the locked state
  }, [active, hasInput])

  // Calculate score based on charge level
  const calculateScore = useCallback((level: number) => {
    if (level >= 85) {
      // Perfect - 85%+ charged
      return 1.5
    } else if (level >= 65) {
      // Good - 65-85% charged
      return 1.25
    } else if (level >= 35) {
      // Okay - 35-65% charged
      return 1.0
    } else {
      // Weak - below 35%
      return 0.8
    }
  }, [])

  // Handle charge increase
  const handleCharge = useCallback(() => {
    if (hasInput || !active || disabled || isKeyDown) return
    
    const now = Date.now()
    const timeSinceLastPress = now - lastPressTime
    
    // Prevent spam clicking (min 50ms between presses)
    if (timeSinceLastPress < 50) return
    
    setPressCount(prev => prev + 1)
    setLastPressTime(now)
    
    // Play tap sound
    gameSounds.play('chargeTap')
    
    // Each press adds charge based on resistance (4-6% base, modified by resistance)
    const baseCharge = 4 + Math.random() * 2
    const chargeIncrease = baseCharge / resistanceMultiplier // Higher resistance = less charge per press
    const newCharge = Math.min(100, chargeLevel + chargeIncrease)
    setChargeLevel(newCharge)
    
    // Play complete sound when reaching max
    if (newCharge >= 100 && chargeLevel < 100) {
      gameSounds.play('chargeComplete')
    }
  }, [hasInput, active, disabled, lastPressTime, isKeyDown, resistanceMultiplier, chargeLevel])

  // Decay charge slowly if not pressing (only when active and not locked)
  useEffect(() => {
    if (!active || hasInput || disabled) return
    
    const interval = setInterval(() => {
      setChargeLevel(prev => Math.max(0, prev - 1)) // Slow decay
    }, 100)
    
    return () => clearInterval(interval)
  }, [active, hasInput, disabled])

  // Auto-submit when countdown reaches 0
  useEffect(() => {
    if (active && countdown === 0 && !hasInput) {
      const finalScore = calculateScore(chargeLevel)
      setScore(finalScore)
      setHasInput(true)
      gameSounds.play('timingLocked')
      onInput(finalScore)
    }
  }, [active, countdown, hasInput, chargeLevel, calculateScore, onInput])

  // Keyboard input with key holding prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && active && !hasInput && !disabled) {
        e.preventDefault()
        // Only process if key wasn't already down (prevents repeat events)
        if (!isKeyDown) {
          setIsKeyDown(true)
          handleCharge()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setIsKeyDown(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [active, hasInput, disabled, handleCharge, isKeyDown])

  // Get zone color based on charge level
  const getZoneColor = (level: number) => {
    if (level >= 85) return 'bg-green-500'
    if (level >= 65) return 'bg-yellow-500'
    if (level >= 35) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Get score text
  const getScoreText = (s: number) => {
    if (s >= 1.5) return 'PERFECT!'
    if (s >= 1.25) return 'GOOD!'
    if (s >= 1.0) return 'OK'
    return 'WEAK'
  }

  // Hide completely if not active and not keeping visible
  if (!active && !keepVisibleAfterInput) return null
  // Hide if not active and keepVisible is true but no input yet
  if (!active && keepVisibleAfterInput && !hasInput) return null

  return (
    <motion.div 
      className={cn("space-y-2", className)}
      animate={{ opacity: hasInput && keepVisibleAfterInput ? 0.6 : 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-green-400">
          CHARGE ATTACK
          {hasInput && keepVisibleAfterInput && (
            <span className="ml-2 text-xs text-yellow-400">(LOCKED)</span>
          )}
        </div>
        {showCountdown && countdown > 0 && !hasInput && (
          <div className="text-xl font-bold text-yellow-400">
            {countdown}s
          </div>
        )}
      </div>

      {/* Vertical Charge Meter - centered layout */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-48 w-20 bg-gray-800 rounded-lg overflow-hidden">
          {/* Zone indicators */}
          <div className="absolute inset-0">
            {/* Perfect zone (top 15%) */}
            <div className="absolute top-0 left-0 right-0 h-[15%] bg-green-900/30 border-b border-green-600/50" />
            {/* Good zone (65-85%) */}
            <div className="absolute top-[15%] left-0 right-0 h-[20%] bg-yellow-900/30 border-b border-yellow-600/50" />
            {/* OK zone (35-65%) */}
            <div className="absolute top-[35%] left-0 right-0 h-[30%] bg-orange-900/20 border-b border-orange-600/30" />
            {/* Weak zone (bottom 35%) */}
            <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-red-900/10" />
          </div>

          {/* Zone labels */}
          <div className="absolute inset-0 flex flex-col justify-between py-1 px-1 text-[8px] font-bold pointer-events-none">
            <span className="text-green-400/70">MAX</span>
            <span className="text-yellow-400/70">GOOD</span>
            <span className="text-orange-400/70">OK</span>
            <span className="text-red-400/70">WEAK</span>
          </div>

          {/* Charge fill */}
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 right-0 transition-all",
              getZoneColor(chargeLevel)
            )}
            animate={{ 
              height: `${chargeLevel}%`,
              opacity: hasInput ? [1, 0.8, 1] : 1
            }}
            transition={{ 
              height: { duration: 0.1 },
              opacity: { duration: 0.5, repeat: hasInput ? Infinity : 0 }
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent animate-pulse" />
          </motion.div>

          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg drop-shadow-lg">
              {Math.floor(chargeLevel)}%
            </span>
          </div>
        </div>

        {/* Instructions or Result - below the meter */}
        {!hasInput ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-center"
          >
            <div className="text-sm text-gray-400">
              Tap <span className="text-white font-bold">SPACE</span> or <span className="text-white font-bold">ENTER</span> rapidly!
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Taps: {pressCount}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-lg font-bold text-center",
              score >= 1.5 && 'text-green-400',
              score >= 1.25 && score < 1.5 && 'text-yellow-400',
              score >= 1.0 && score < 1.25 && 'text-orange-400',
              score < 1.0 && 'text-red-400'
            )}
          >
            <div>{getScoreText(score)}</div>
            <div className="text-sm mt-1">
              {`${(score * 100).toFixed(0)}% power`}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}