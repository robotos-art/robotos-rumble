'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Heart, Swords, Shield, Zap, Gauge, Sparkles, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { BattleUnitV3, TraitProcessorV3 } from '../../lib/game-engine/TraitProcessorV3'
import { gameSounds } from '../../lib/sounds/gameSounds'

interface UnitLightboxProps {
  units: BattleUnitV3[]
  initialIndex: number
  onClose: () => void
  onSelect?: (unit: BattleUnitV3) => void
  selectedTeam?: BattleUnitV3[]
}

export function UnitLightbox({ units, initialIndex, onClose, onSelect, selectedTeam = [] }: UnitLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const currentUnit = units[currentIndex]
  const isSelected = selectedTeam.find(u => u.id === currentUnit.id)
  const canSelect = !isSelected && selectedTeam.length < 5

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      gameSounds.playClick()
    }
  }, [currentIndex])

  const navigateNext = useCallback(() => {
    if (currentIndex < units.length - 1) {
      setCurrentIndex(currentIndex + 1)
      gameSounds.playClick()
    }
  }, [currentIndex, units.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          navigatePrev()
          break
        case 'ArrowRight':
          navigateNext()
          break
        case 'Enter':
        case ' ':
          if (onSelect && canSelect) {
            onSelect(currentUnit)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, currentUnit, canSelect, onClose, onSelect, units.length, navigatePrev, navigateNext])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <Button
          variant="terminal"
          size="icon"
          className="absolute -top-12 right-0"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Navigation buttons */}
        <Button
          variant="terminal"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16"
          onClick={navigatePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Button
          variant="terminal"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16"
          onClick={navigateNext}
          disabled={currentIndex === units.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Main content */}
        <div className="bg-black/95 border-2 border-green-500 rounded-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Image */}
            <div className="bg-black/50 border-r border-green-500/20 p-8 flex items-center justify-center">
              <img 
                src={currentUnit.imageUrl} 
                alt={currentUnit.name}
                className="w-full max-w-sm h-auto pixelated"
              />
            </div>

            {/* Right side - Details */}
            <div className="p-8">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">{currentUnit.name}</h2>
                <div className="text-xl" style={{ color: TraitProcessorV3.getElementColor(currentUnit.element) }}>
                  {TraitProcessorV3.getElementSymbol(currentUnit.element)} {currentUnit.element}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/50 border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 text-red-500 mb-2">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">HEALTH</span>
                  </div>
                  <div className="text-2xl font-mono">{currentUnit.stats.hp}</div>
                </div>

                <div className="bg-black/50 border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 text-orange-500 mb-2">
                    <Swords className="w-5 h-5" />
                    <span className="text-sm">ATTACK</span>
                  </div>
                  <div className="text-2xl font-mono">{currentUnit.stats.attack}</div>
                </div>

                <div className="bg-black/50 border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 text-blue-500 mb-2">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm">DEFENSE</span>
                  </div>
                  <div className="text-2xl font-mono">{currentUnit.stats.defense}</div>
                </div>

                <div className="bg-black/50 border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 text-yellow-500 mb-2">
                    <Zap className="w-5 h-5" />
                    <span className="text-sm">SPEED</span>
                  </div>
                  <div className="text-2xl font-mono">{currentUnit.stats.speed}</div>
                </div>

                <div className="bg-black/50 border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 text-purple-500 mb-2">
                    <Gauge className="w-5 h-5" />
                    <span className="text-sm">ENERGY</span>
                  </div>
                  <div className="text-2xl font-mono">{currentUnit.stats.energy}</div>
                </div>

                <div className="bg-black/50 border border-green-500/30 rounded p-4">
                  <div className="flex items-center gap-2 text-pink-500 mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm">CRITICAL</span>
                  </div>
                  <div className="text-2xl font-mono">{currentUnit.stats.crit}%</div>
                </div>
              </div>

              {/* Abilities */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-green-400 mb-3">ABILITIES</h3>
                <div className="space-y-2">
                  {currentUnit.abilities.map(abilityId => {
                    const ability = TraitProcessorV3.getAbilityData(abilityId)
                    return ability ? (
                      <div 
                        key={abilityId}
                        className="p-3 bg-black/50 border border-green-500/30 rounded"
                        style={{ 
                          borderColor: TraitProcessorV3.getElementColor(ability.element) + '40',
                          backgroundColor: TraitProcessorV3.getElementColor(ability.element) + '0A'
                        }}
                      >
                        <div className="font-semibold mb-1">{ability.name}</div>
                        <div className="text-sm text-green-400/80">{ability.description}</div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>

              {/* Select button */}
              {onSelect && (
                <Button
                  variant="terminal"
                  size="lg"
                  className="w-full"
                  onClick={() => onSelect(currentUnit)}
                  disabled={!canSelect}
                >
                  {isSelected ? (
                    '[ALREADY SELECTED]'
                  ) : selectedTeam.length >= 5 ? (
                    '[TEAM FULL]'
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      [ADD TO TEAM]
                    </>
                  )}
                </Button>
              )}

              {/* Navigation info */}
              <div className="mt-4 text-center text-green-400/60 text-sm">
                {currentIndex + 1} of {units.length} • Use arrow keys to navigate
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}