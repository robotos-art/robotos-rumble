'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { cn } from '../../lib/utils'
import { BattleUnitV3 } from '../../lib/game-engine/TraitProcessorV3'
import { ChevronLeft, Shield, Zap, Heart, Clock, Target } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import Image from 'next/image'

interface BattleFooterProps {
  // Current battle state
  currentUnit: BattleUnitV3 | null
  targetUnit: BattleUnitV3 | null
  playerTeam: BattleUnitV3[]
  enemyTeam: BattleUnitV3[]
  isPlayerTurn: boolean
  
  // Battle phase
  phase: 'waiting' | 'selecting-action' | 'selecting-target' | 'attack-timing' | 'defending' | 'executing'
  
  // Actions
  onAttack: () => void
  onAbility: (index: number) => void
  onTargetSelect: (unitId: string, autoConfirm?: boolean) => void
  onTargetConfirm: () => void
  onCancel: () => void
  
  // Countdowns
  actionCountdown?: number
  targetCountdown?: number
  
  // Messages
  message?: string
  
  // Unit statuses - matches BattleEngineV3's UnitStatus interface
  unitStatuses: Map<string, { isAlive: boolean; currentHp: number; currentEnergy: number; statusEffects: any[]; cooldowns: Map<string, number>; position?: number }>
  
  // UI focus state
  focusedActionIndex?: number
  setFocusedActionIndex?: React.Dispatch<React.SetStateAction<number>>
}

export default function BattleFooter({
  currentUnit,
  targetUnit,
  playerTeam,
  enemyTeam,
  isPlayerTurn,
  phase,
  onAttack,
  onAbility,
  onTargetSelect,
  onTargetConfirm,
  onCancel,
  actionCountdown = 5,
  targetCountdown = 5,
  message,
  unitStatuses,
  focusedActionIndex = 0,
  setFocusedActionIndex
}: BattleFooterProps) {
  const [selectedAction, setSelectedAction] = useState<'attack' | 'ability' | null>(null)
  const [selectedAbilityIndex, setSelectedAbilityIndex] = useState(0)
  const [localFocusedIndex, setLocalFocusedIndex] = useState(0)
  
  // Use prop if provided, otherwise use local state
  const focusIndex = setFocusedActionIndex ? focusedActionIndex : localFocusedIndex
  const setFocusIndex = setFocusedActionIndex || setLocalFocusedIndex
  
  // Handler functions
  const handleAttack = useCallback(() => {
    setSelectedAction('attack')
    onAttack()
  }, [onAttack])
  
  const handleAbility = useCallback((index: number) => {
    setSelectedAction('ability')
    setSelectedAbilityIndex(index)
    onAbility(index)
  }, [onAbility])
  
  // Remove timing-related handlers - no longer needed
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      
      if (phase === 'selecting-action' && isPlayerTurn) {
        const totalActions = 1 + (currentUnit?.abilities?.length || 0)
        
        switch (e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            if (typeof setFocusIndex === 'function') {
              setFocusIndex((prev) => (prev - 1 + totalActions) % totalActions)
            }
            break
          case 'ArrowRight':
          case 'ArrowDown':
            if (typeof setFocusIndex === 'function') {
              setFocusIndex((prev) => (prev + 1) % totalActions)
            }
            break
          case 'Enter':
          case ' ':
            if (focusIndex === 0) {
              handleAttack()
            } else if (currentUnit?.abilities[focusIndex - 1]) {
              handleAbility(focusIndex - 1)
            }
            break
          case '1':
          case 'a':
            if (typeof setFocusIndex === 'function') {
              setFocusIndex(0)
            }
            handleAttack()
            break
          case '2':
          case 's':
            if (currentUnit?.abilities[0]) {
              if (typeof setFocusIndex === 'function') {
                setFocusIndex(1)
              }
              handleAbility(0)
            }
            break
          case '3':
          case 'd':
            if (currentUnit?.abilities[1]) {
              if (typeof setFocusIndex === 'function') {
                setFocusIndex(2)
              }
              handleAbility(1)
            }
            break
        }
      }
      
      if (phase === 'selecting-target') {
        if (e.key === 'Enter' || e.key === ' ') {
          onTargetConfirm()
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // Handle target navigation
          const targets = enemyTeam.filter(unit => {
            const status = unitStatuses.get(unit.id)
            return status?.isAlive
          })
          if (targets.length > 1) {
            const currentIndex = targets.findIndex(t => t.id === targetUnit?.id)
            let newIndex = currentIndex
            if (e.key === 'ArrowLeft') {
              newIndex = currentIndex > 0 ? currentIndex - 1 : targets.length - 1
            } else {
              newIndex = currentIndex < targets.length - 1 ? currentIndex + 1 : 0
            }
            onTargetSelect(targets[newIndex].id)
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [phase, isPlayerTurn, currentUnit, onCancel, onTargetConfirm, focusIndex, setFocusIndex, handleAttack, handleAbility, enemyTeam, targetUnit, onTargetSelect, unitStatuses])
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 border-t-2 border-green-800">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-4 space-y-3">
          {/* Status Bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {currentUnit && (
                <>
                  <span className="text-green-400">Current: {currentUnit.name}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-yellow-400">Turn {isPlayerTurn ? 'Player' : 'Enemy'}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {message && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-cyan-400"
                >
                  {message}
                </motion.span>
              )}
            </div>
          </div>
          
          {/* Countdown Timer */}
          {(phase === 'selecting-action' || phase === 'selecting-target') && (
            <div className="text-center mb-2">
              <span className="text-yellow-400 text-lg font-bold animate-pulse">
                Time: {phase === 'selecting-action' ? actionCountdown : targetCountdown}s
              </span>
            </div>
          )}
          
          {/* Action Area */}
          <AnimatePresence mode="wait">
            {/* Action Selection */}
            {phase === 'selecting-action' && isPlayerTurn && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-4"
              >
                <Button
                  onClick={handleAttack}
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    focusIndex === 0 && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black"
                  )}
                  variant={focusIndex === 0 ? "default" : "outline"}
                >
                  <Zap className="w-4 h-4" />
                  Attack (A)
                </Button>
                
                {currentUnit?.abilities.map((ability, index) => {
                  const unitStatus = currentUnit && unitStatuses.get(currentUnit.id)
                  const cooldown = unitStatus?.cooldowns.get(ability) || 0
                  const isOnCooldown = cooldown > 0
                  
                  return (
                    <TooltipProvider key={ability}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Button
                              onClick={() => !isOnCooldown && handleAbility(index)}
                              className={cn(
                                "flex items-center gap-2 transition-all",
                                focusIndex === index + 1 && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black",
                                isOnCooldown && "opacity-50 cursor-not-allowed"
                              )}
                              variant={focusIndex === index + 1 ? "default" : "outline"}
                              disabled={isOnCooldown}
                            >
                              <Target className="w-4 h-4" />
                              {ability} ({index === 0 ? 'S' : 'D'})
                            </Button>
                            {isOnCooldown && (
                              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {cooldown === 999 ? '∞' : cooldown}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        {isOnCooldown && (
                          <TooltipContent>
                            <p className="text-red-400">
                              {cooldown === 999 
                                ? 'Once per battle - Already used!' 
                                : `Cooldown: ${cooldown} turn${cooldown > 1 ? 's' : ''} remaining`}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
                
                <div className="ml-auto text-sm text-gray-400">
                  Use ←→ or ↑↓ to navigate • <kbd className="text-xs">ENTER</kbd>/<kbd className="text-xs">SPACE</kbd> to select • Number keys for quick select
                </div>
              </motion.div>
            )}
            
            {/* Target Selection */}
            {phase === 'selecting-target' && (
              <motion.div
                key="targets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-green-400">Select Target:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={onCancel}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Cancel <kbd className="text-xs ml-1">ESC</kbd>
                    </Button>
                    <Button
                      onClick={onTargetConfirm}
                      size="sm"
                      disabled={!targetUnit}
                    >
                      Confirm <kbd className="text-xs ml-1">ENTER</kbd>
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {enemyTeam.map(unit => {
                    const status = unitStatuses.get(unit.id)
                    const isAlive = status?.isAlive ?? true
                    const isSelected = targetUnit?.id === unit.id
                    
                    return (
                      <motion.button
                        key={unit.id}
                        onClick={() => isAlive && onTargetSelect(unit.id, true)}
                        disabled={!isAlive}
                        whileHover={isAlive ? { scale: 1.05 } : {}}
                        whileTap={isAlive ? { scale: 0.95 } : {}}
                        className={cn(
                          "p-2 rounded-lg border-2 transition-all flex items-center gap-2",
                          isAlive ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                          isSelected ? "border-yellow-400 bg-yellow-400/20" : "border-green-800 hover:border-green-600"
                        )}
                      >
                        {/* Roboto thumbnail */}
                        <div className="relative w-10 h-10 bg-black rounded-lg overflow-hidden flex-shrink-0">
                          {unit.imageUrl ? (
                            <Image
                              src={unit.imageUrl}
                              alt={unit.name}
                              fill
                              className="object-contain transform scale-x-[-1]"
                              sizes="40px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-green-400 text-lg font-bold">
                              {unit.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="text-xs">
                          <div className="font-bold">{unit.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Heart className="w-3 h-3" />
                            {status?.currentHp ?? 100}/{unit.stats.hp}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
            
            {/* Remove timing and defense UI - no longer needed */}
          </AnimatePresence>
          
          {/* Team Status Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-green-800/50">
            <div className="flex gap-1">
              {playerTeam.map((unit, index) => {
                const status = unitStatuses.get(unit.id)
                const isAlive = status?.isAlive ?? true
                const isCurrent = currentUnit?.id === unit.id
                
                return (
                  <div
                    key={unit.id}
                    className={cn(
                      "w-12 h-3 rounded-lg transition-all",
                      isAlive ? "bg-green-600" : "bg-gray-600",
                      isCurrent && "ring-2 ring-yellow-400"
                    )}
                  />
                )
              })}
            </div>
            
            <div className="flex gap-1">
              {enemyTeam.map((unit, index) => {
                const status = unitStatuses.get(unit.id)
                const isAlive = status?.isAlive ?? true
                const isCurrent = currentUnit?.id === unit.id
                
                return (
                  <div
                    key={unit.id}
                    className={cn(
                      "w-12 h-3 rounded-lg transition-all",
                      isAlive ? "bg-red-600" : "bg-gray-600",
                      isCurrent && "ring-2 ring-yellow-400"
                    )}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}