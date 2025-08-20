'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { gameSounds } from '../../lib/sounds/gameSounds'

interface TimingMeterProps {
  active: boolean
  onInput: (score: number) => void
  type?: 'attack' | 'defense'
  showCountdown?: boolean
  countdown?: number
  disabled?: boolean
  className?: string
  keepVisibleAfterInput?: boolean
}

export default function TimingMeter({
  active,
  onInput,
  type = 'attack',
  showCountdown = false,
  countdown = 5,
  disabled = false,
  className,
  keepVisibleAfterInput = false
}: TimingMeterProps) {
  const [position, setPosition] = useState(50)
  const [direction, setDirection] = useState(1)
  const [hasInput, setHasInput] = useState(false)
  const [score, setScore] = useState(0)
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)

  // Reset when becoming active
  useEffect(() => {
    if (active && !hasInput) {
      setPosition(50)
      setDirection(1)
      setHasInput(false)
      setScore(0)
      // Randomize speed: 0.8x to 1.6x (2 to 4 actual speed)
      // Base speed is 2.5, so we want 2/2.5 = 0.8 to 4/2.5 = 1.6
      const newSpeed = 0.8 + Math.random() * 0.8
      setSpeedMultiplier(newSpeed)
    }
  }, [active, hasInput])

  // Animate the meter
  useEffect(() => {
    if (!active || hasInput || disabled) return

    const interval = setInterval(() => {
      setPosition(prev => {
        const baseSpeed = 2.5 // Moderate base speed
        const speed = baseSpeed * speedMultiplier // Apply random multiplier
        let next = prev + (direction * speed)
        
        // Bounce off edges
        if (next >= 100) {
          next = 100
          setDirection(-1)
        } else if (next <= 0) {
          next = 0
          setDirection(1)
        }
        
        return next
      })
    }, 20)

    return () => clearInterval(interval)
  }, [active, direction, hasInput, disabled, speedMultiplier])

  // Calculate score based on position
  const calculateScore = useCallback((pos: number) => {
    const distance = Math.abs(pos - 50)
    
    if (distance <= 5) {
      // Perfect - within 5% of center
      return 1.5
    } else if (distance <= 15) {
      // Good - within 15% of center
      return 1.25
    } else if (distance <= 30) {
      // Okay - within 30% of center
      return 1.0
    } else {
      // Weak - further than 30%
      return 0.8
    }
  }, [])

  // Handle input
  const handleInput = useCallback(() => {
    if (hasInput || !active || disabled) return
    
    const finalScore = calculateScore(position)
    setScore(finalScore)
    setHasInput(true)
    
    // Play timing feedback sound
    if (finalScore >= 1.5) {
      gameSounds.play('timingPerfect')
    } else if (finalScore >= 1.25) {
      gameSounds.play('timingGood')
    } else if (finalScore >= 1.0) {
      gameSounds.play('timingLocked')
    } else {
      gameSounds.play('timingMiss')
    }
    
    onInput(finalScore)
  }, [position, hasInput, active, disabled, calculateScore, onInput])

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && active && !hasInput && !disabled) {
        e.preventDefault()
        handleInput()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, hasInput, disabled, handleInput])

  // Handle click/tap for mobile
  const handleTapInput = useCallback(() => {
    if (active && !hasInput && !disabled) {
      handleInput()
    }
  }, [active, hasInput, disabled, handleInput])

  // Get zone color based on position
  const getZoneColor = (pos: number) => {
    const distance = Math.abs(pos - 50)
    if (distance <= 5) return 'bg-green-500'
    if (distance <= 15) return 'bg-yellow-500'
    if (distance <= 30) return 'bg-orange-500'
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
          {type === 'attack' ? 'ATTACK TIMING' : 'DEFENSE TIMING'}
          {hasInput && keepVisibleAfterInput && (
            <span className="ml-2 text-xs text-yellow-400">(LOCKED)</span>
          )}
        </div>
        {showCountdown && countdown > 0 && (
          <div className="text-xl font-bold text-yellow-400">
            {countdown}s
          </div>
        )}
      </div>

      {/* Meter */}
      <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden">
        {/* Zone indicators */}
        <div className="absolute inset-0 flex items-center">
          {/* Perfect zone (center 10%) */}
          <div className="absolute left-[45%] right-[45%] h-full bg-green-900/30 border-x border-green-600/50" />
          {/* Good zones (15-30% from center) */}
          <div className="absolute left-[35%] right-[65%] h-full bg-yellow-900/20 border-x border-yellow-600/30" />
          <div className="absolute left-[65%] right-[35%] h-full bg-yellow-900/20 border-x border-yellow-600/30" />
          {/* Okay zones (30-60% from center) */}
          <div className="absolute left-[20%] right-[80%] h-full bg-orange-900/10" />
          <div className="absolute left-[80%] right-[20%] h-full bg-orange-900/10" />
        </div>

        {/* Center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 z-10" />

        {/* Moving indicator */}
        <motion.div
          className={cn(
            "absolute top-1 bottom-1 w-2 rounded",
            hasInput ? getZoneColor(position) : 'bg-white',
            hasInput && 'animate-pulse'
          )}
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          animate={hasInput ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        />

        {/* Zone labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold pointer-events-none">
          <span className="text-red-400/70">WEAK</span>
          <span className="text-orange-400/70">OK</span>
          <span className="text-yellow-400/70">GOOD</span>
          <span className="text-green-400/70">PERFECT</span>
          <span className="text-yellow-400/70">GOOD</span>
          <span className="text-orange-400/70">OK</span>
          <span className="text-red-400/70">WEAK</span>
        </div>
      </div>

      {/* Instructions or Result */}
      <div className="text-center">
        {hasInput ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-lg font-bold",
              score >= 1.5 && 'text-green-400',
              score >= 1.25 && score < 1.5 && 'text-yellow-400',
              score >= 1.0 && score < 1.25 && 'text-orange-400',
              score < 1.0 && 'text-red-400'
            )}
          >
            {getScoreText(score)} 
            {type === 'attack' && <span className="text-sm"> {`${(score * 100).toFixed(0)}% power`}</span>}
          </motion.div>
        ) : (
          <>
            {/* Desktop instructions */}
            <div className="hidden sm:block text-sm text-gray-400">
              Press <span className="text-white font-bold">SPACE</span> to {type === 'attack' ? 'attack' : 'defend'}!
            </div>
            {/* Mobile tap button */}
            <button
              onClick={handleTapInput}
              disabled={!active || hasInput || disabled}
              className={cn(
                "sm:hidden w-full py-4 px-6 rounded-lg font-bold text-lg transition-all",
                "bg-green-900/50 border-2 border-green-500",
                "active:scale-95 active:bg-green-800/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              TAP TO {type === 'attack' ? 'ATTACK' : 'DEFEND'}!
            </button>
            {/* Mobile instructions */}
            <div className="sm:hidden text-xs text-gray-500 mt-1">
              Tap when the bar is in the center!
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}