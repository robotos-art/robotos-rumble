'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { BattleUnitV3 } from '../../lib/game-engine/TraitProcessorV3'
import { BattleEngineV3 } from '../../lib/game-engine/BattleEngineV3'
import { gameSounds } from '../../lib/sounds/gameSounds'
import RobotoUnit from './RobotoUnit'
import ActionMenu from './ActionMenu'
import BattleLog from './BattleLog'
import TargetSelector from './TargetSelector'

interface BattleArenaV2Props {
  playerTeam: BattleUnitV3[]
  enemyTeam: BattleUnitV3[]
  onBattleEnd: (won: boolean) => void
}

export default function BattleArenaV2({ 
  playerTeam, 
  enemyTeam, 
  onBattleEnd 
}: BattleArenaV2Props) {
  // Battle state
  const [battleEngine] = useState(() => new BattleEngineV3())
  const [battleState, setBattleState] = useState(battleEngine.getState())
  const [currentUnit, setCurrentUnit] = useState<BattleUnitV3 | null>(null)
  
  // UI state
  const [selectingTarget, setSelectingTarget] = useState(false)
  const [validTargets, setValidTargets] = useState<string[]>([])
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    type: 'attack' | 'ability'
    abilityId?: string
  } | null>(null)
  
  // Initialize battle
  useEffect(() => {
    battleEngine.initializeBattle(playerTeam, enemyTeam)
    setBattleState(battleEngine.getState())
    gameSounds.play('roundStart')
    startNextTurn()
  }, [])
  
  const startNextTurn = useCallback(() => {
    const state = battleEngine.getState()
    setBattleState(state)
    
    if (state.status !== 'active') {
      handleBattleEnd(state.status === 'victory')
      return
    }
    
    const unit = battleEngine.getCurrentUnit()
    if (!unit) return
    
    setCurrentUnit(unit)
    const isPlayerUnit = playerTeam.some(u => u.id === unit.id)
    
    if (!isPlayerUnit) {
      // AI turn
      setTimeout(() => {
        battleEngine.executeAITurn()
        setBattleState(battleEngine.getState())
        startNextTurn()
      }, 1500)
    } else {
      gameSounds.play('turnStart')
    }
  }, [battleEngine, playerTeam])
  
  const handleBattleEnd = (won: boolean) => {
    if (won) {
      gameSounds.play('victory')
    } else {
      gameSounds.play('defeat')
    }
    
    setTimeout(() => {
      onBattleEnd(won)
    }, 3000)
  }
  
  const handleAttack = () => {
    setPendingAction({ type: 'attack' })
    setSelectingTarget(true)
    
    // Get valid enemy targets
    const targets = enemyTeam
      .filter(unit => battleState.unitStatuses.get(unit.id)?.isAlive)
      .map(unit => unit.id)
    setValidTargets(targets)
    setSelectedTarget(targets[0] || null)
  }
  
  const handleAbility = (abilityIndex: number) => {
    const abilityId = currentUnit?.abilities[abilityIndex]
    if (!abilityId) return
    
    setPendingAction({ type: 'ability', abilityId })
    setSelectingTarget(true)
    
    // Get valid targets (for now, always enemy team)
    const targets = enemyTeam
      .filter(unit => battleState.unitStatuses.get(unit.id)?.isAlive)
      .map(unit => unit.id)
    setValidTargets(targets)
    setSelectedTarget(targets[0] || null)
  }
  
  const executeAction = (targetId: string) => {
    if (!currentUnit || !pendingAction) return
    
    gameSounds.play('attack')
    
    const result = battleEngine.executeAction({
      type: pendingAction.type,
      sourceId: currentUnit.id,
      targetId,
      abilityId: pendingAction.abilityId,
      timingBonus: 1.0 // TODO: Add timing minigame
    })
    
    setBattleState(battleEngine.getState())
    setSelectingTarget(false)
    setPendingAction(null)
    setSelectedTarget(null)
    
    // Continue to next turn after animation
    setTimeout(() => {
      startNextTurn()
    }, 1000)
  }
  
  const isCurrentUnit = (unitId: string) => currentUnit?.id === unitId
  const isValidTarget = (unitId: string) => validTargets.includes(unitId)
  const isAlive = (unitId: string) => battleState.unitStatuses.get(unitId)?.isAlive ?? true
  
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-black to-green-950/20 flex flex-col">
      {/* Battle Arena */}
      <div className="flex-1 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(0deg, #00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Battle Field */}
        <div className="h-full flex items-center justify-between px-8 md:px-16 lg:px-24">
          {/* Player Team */}
          <div className="grid grid-rows-2 gap-4 md:gap-8">
            {/* Back row (3 units) */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {playerTeam.slice(0, 3).map((unit, index) => (
                <RobotoUnit
                  key={unit.id}
                  unit={unit}
                  isActive={isCurrentUnit(unit.id)}
                  isTarget={selectingTarget && isValidTarget(unit.id)}
                  isSelected={selectedTarget === unit.id}
                  isAlive={isAlive(unit.id)}
                  onClick={() => {
                    if (selectingTarget && isValidTarget(unit.id)) {
                      setSelectedTarget(unit.id)
                    }
                  }}
                  delay={index * 0.1}
                />
              ))}
            </div>
            {/* Front row (2 units) */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 mx-auto">
              {playerTeam.slice(3, 5).map((unit, index) => (
                <RobotoUnit
                  key={unit.id}
                  unit={unit}
                  isActive={isCurrentUnit(unit.id)}
                  isTarget={selectingTarget && isValidTarget(unit.id)}
                  isSelected={selectedTarget === unit.id}
                  isAlive={isAlive(unit.id)}
                  onClick={() => {
                    if (selectingTarget && isValidTarget(unit.id)) {
                      setSelectedTarget(unit.id)
                    }
                  }}
                  delay={(index + 3) * 0.1}
                />
              ))}
            </div>
          </div>
          
          {/* Enemy Team */}
          <div className="grid grid-rows-2 gap-4 md:gap-8">
            {/* Back row (3 units) */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {enemyTeam.slice(0, 3).map((unit, index) => (
                <RobotoUnit
                  key={unit.id}
                  unit={unit}
                  isActive={isCurrentUnit(unit.id)}
                  isTarget={selectingTarget && isValidTarget(unit.id)}
                  isSelected={selectedTarget === unit.id}
                  isAlive={isAlive(unit.id)}
                  isEnemy
                  onClick={() => {
                    if (selectingTarget && isValidTarget(unit.id)) {
                      setSelectedTarget(unit.id)
                    }
                  }}
                  delay={index * 0.1}
                />
              ))}
            </div>
            {/* Front row (2 units) */}
            <div className="grid grid-cols-2 gap-2 md:gap-4 mx-auto">
              {enemyTeam.slice(3, 5).map((unit, index) => (
                <RobotoUnit
                  key={unit.id}
                  unit={unit}
                  isActive={isCurrentUnit(unit.id)}
                  isTarget={selectingTarget && isValidTarget(unit.id)}
                  isSelected={selectedTarget === unit.id}
                  isAlive={isAlive(unit.id)}
                  isEnemy
                  onClick={() => {
                    if (selectingTarget && isValidTarget(unit.id)) {
                      setSelectedTarget(unit.id)
                    }
                  }}
                  delay={(index + 3) * 0.1}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Menu */}
        <AnimatePresence>
          {currentUnit && !selectingTarget && playerTeam.some(u => u.id === currentUnit.id) && (
            <ActionMenu
              unit={currentUnit}
              onAttack={handleAttack}
              onAbility={handleAbility}
              onSwitch={() => {
                gameSounds.play('cancel')
                // TODO: Implement switch
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Target Selector */}
        <AnimatePresence>
          {selectingTarget && selectedTarget && (
            <TargetSelector
              onConfirm={() => executeAction(selectedTarget)}
              onCancel={() => {
                setSelectingTarget(false)
                setPendingAction(null)
                setSelectedTarget(null)
                gameSounds.play('cancel')
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Victory/Defeat Overlay */}
        <AnimatePresence>
          {battleState.status !== 'active' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center"
            >
              <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={cn(
                  "text-6xl md:text-8xl font-bold",
                  battleState.status === 'victory' ? 'text-green-400' : 'text-red-500'
                )}
              >
                {battleState.status === 'victory' ? 'VICTORY!' : 'DEFEAT'}
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Battle Log */}
      <BattleLog events={battleState.battleLog} />
    </div>
  )
}