'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { BattleUnitV3, TraitProcessorV3 } from '../../lib/game-engine/TraitProcessorV3'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { Sword, Sparkles, Repeat } from 'lucide-react'

interface ActionMenuProps {
  unit: BattleUnitV3
  onAttack: () => void
  onAbility: (index: number) => void
  onSwitch: () => void
}

export default function ActionMenu({ unit, onAttack, onAbility, onSwitch }: ActionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showAbilities, setShowAbilities] = useState(false)
  
  const menuOptions = showAbilities ? unit.abilities : ['attack', 'ability', 'switch']
  const maxIndex = showAbilities ? unit.abilities.length - 1 : 2
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : maxIndex
            gameSounds.play('menuNavigate')
            return newIndex
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => {
            const newIndex = prev < maxIndex ? prev + 1 : 0
            gameSounds.play('menuNavigate')
            return newIndex
          })
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleSelect()
          break
        case 'Escape':
          e.preventDefault()
          if (showAbilities) {
            setShowAbilities(false)
            setSelectedIndex(1) // Return to ability option
            gameSounds.play('cancel')
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, maxIndex, showAbilities])
  
  const handleSelect = () => {
    gameSounds.play('select')
    
    if (showAbilities) {
      onAbility(selectedIndex)
      return
    }
    
    switch (selectedIndex) {
      case 0:
        onAttack()
        break
      case 1:
        if (unit.abilities.length > 0) {
          setShowAbilities(true)
          setSelectedIndex(0)
        } else {
          gameSounds.play('error')
        }
        break
      case 2:
        onSwitch()
        break
    }
  }
  
  const renderMainMenu = () => (
    <>
      <h3 className="text-green-400 text-lg font-bold mb-4">SELECT ACTION</h3>
      
      <div className="space-y-2">
        <Button
          variant="terminal"
          size="lg"
          className={cn(
            "w-full justify-start gap-3",
            selectedIndex === 0 && "ring-2 ring-yellow-400 bg-green-950/50"
          )}
          onClick={() => {
            setSelectedIndex(0)
            handleSelect()
          }}
        >
          <Sword className="w-5 h-5" />
          ATTACK
        </Button>
        
        <Button
          variant="terminal"
          size="lg"
          className={cn(
            "w-full justify-start gap-3",
            selectedIndex === 1 && "ring-2 ring-yellow-400 bg-green-950/50",
            unit.abilities.length === 0 && "opacity-50"
          )}
          onClick={() => {
            setSelectedIndex(1)
            handleSelect()
          }}
        >
          <Sparkles className="w-5 h-5" />
          ABILITY ({unit.abilities.length})
        </Button>
        
        <Button
          variant="terminal"
          size="lg"
          className={cn(
            "w-full justify-start gap-3",
            selectedIndex === 2 && "ring-2 ring-yellow-400 bg-green-950/50"
          )}
          onClick={() => {
            setSelectedIndex(2)
            handleSelect()
          }}
        >
          <Repeat className="w-5 h-5" />
          SWITCH
        </Button>
      </div>
    </>
  )
  
  const renderAbilityMenu = () => (
    <>
      <h3 className="text-green-400 text-lg font-bold mb-4">SELECT ABILITY</h3>
      
      <div className="space-y-2">
        {unit.abilities.map((abilityId, index) => {
          const ability = TraitProcessorV3.getAbilityData(abilityId)
          if (!ability) return null
          
          const elementColors = {
            SURGE: 'text-yellow-400',
            CODE: 'text-cyan-400',
            METAL: 'text-gray-400',
            GLITCH: 'text-purple-400'
          }
          
          return (
            <Button
              key={abilityId}
              variant="terminal"
              size="lg"
              className={cn(
                "w-full justify-between",
                selectedIndex === index && "ring-2 ring-yellow-400 bg-green-950/50"
              )}
              onClick={() => {
                setSelectedIndex(index)
                handleSelect()
              }}
            >
              <span className="text-left">
                {ability.name.toUpperCase()}
              </span>
              <span className={cn(
                "text-xs",
                elementColors[ability.element as keyof typeof elementColors]
              )}>
                {ability.power} PWR
              </span>
            </Button>
          )
        })}
      </div>
      
      <p className="text-xs text-green-600 mt-2">Press ESC to go back</p>
    </>
  )
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <Card className="bg-black/90 border-green-400 p-6 min-w-[300px]">
        {showAbilities ? renderAbilityMenu() : renderMainMenu()}
      </Card>
    </motion.div>
  )
}