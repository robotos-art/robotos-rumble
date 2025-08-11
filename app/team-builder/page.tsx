'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip'
import { WalletConnect } from '../../components/shared/WalletConnect'
import { useRobotoTokensContext } from '../../contexts/RobotoTokensContext'
import { TraitProcessorV3, BattleUnitV3 } from '../../lib/game-engine/TraitProcessorV3'
import { ArrowLeft, Shield, Swords, Zap, Heart, Gauge, Sparkles, RefreshCw, Expand } from 'lucide-react'
import Link from 'next/link'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { UnitFilters } from '../../components/team-builder/UnitFilters'
import { UnitLightbox } from '../../components/team-builder/UnitLightbox'
import { cardAnimations, buttonAnimations, pageTransition } from '../../lib/animations/gameAnimations'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'

export default function TeamBuilder() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { robotos, robopets, loading, error, loadingProgress, refetch } = useRobotoTokensContext()
  const [selectedTeam, setSelectedTeam] = useState<BattleUnitV3[]>([])
  const [mounted, setMounted] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)

    // Load saved team from localStorage
    const savedTeam = localStorage.getItem('roboto_rumble_team')
    if (savedTeam) {
      try {
        const team = JSON.parse(savedTeam)
        if (Array.isArray(team)) {
          setSelectedTeam(team)
        }
      } catch (e) {
        // Failed to load saved team, continue with empty team
      }
    }
  }, [])

  // Process units as they load - Robotos first, then Robopets
  const processedUnits = useMemo(() => {
    const units: BattleUnitV3[] = []
    const processedIds = new Set<string>()


    // Process Robotos first
    robotos.forEach(token => {
      try {
        const unit = TraitProcessorV3.processRobotoTraits(token.metadata)
        if (!processedIds.has(unit.id)) {
          processedIds.add(unit.id)
          units.push(unit)
        }
      } catch (e) {
        // Failed to process roboto, skip it
      }
    })

    // Then process Robopets
    robopets.forEach(token => {
      try {
        const unit = TraitProcessorV3.processRobopetTraits(token.metadata)
        if (!processedIds.has(unit.id)) {
          processedIds.add(unit.id)
          units.push(unit)
        }
      } catch (e) {
        // Failed to process robopet, skip it
      }
    })


    return units
  }, [robotos, robopets])

  // State for filters - start with default values to show all units
  const [currentFilters, setCurrentFilters] = useState<any>({
    search: '',
    elements: [],
    robotType: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  })

  // Calculate filtered units based on current filters and processed units
  const filteredUnits = useMemo(() => {

    let filtered = [...processedUnits]

    // Search filter
    if (currentFilters.search && currentFilters.search.trim() !== '') {
      const search = currentFilters.search.toLowerCase()
      filtered = filtered.filter(unit =>
        unit.name.toLowerCase().includes(search) ||
        unit.id.toLowerCase().includes(search)
      )
    }

    // Element filter
    if (currentFilters.elements && currentFilters.elements.length > 0) {
      filtered = filtered.filter(unit =>
        currentFilters.elements.includes(unit.element)
      )
    }

    // Robot type filter
    if (currentFilters.robotType && currentFilters.robotType !== 'all') {
      filtered = filtered.filter(unit => {
        switch (currentFilters.robotType) {
          case 'roboto':
            // For regular Robotos (not Helmeto, Cyborgo, Computo)
            return unit.type === 'roboto' && (!unit.traits['Robot Type'] || unit.traits['Robot Type'] === 'Roboto')
          case 'robopet':
            return unit.type === 'robopet'
          case 'helmeto':
            return unit.type === 'roboto' && unit.traits['Robot Type'] === 'Roboto Helmeto'
          case 'cyborgo':
            return unit.type === 'roboto' && unit.traits['Robot Type'] === 'Roboto Cyborgo'
          case 'computo':
            return unit.type === 'roboto' && unit.traits['Robot Type'] === 'Roboto Computo'
          default:
            return true
        }
      })
    }

    // Stat filters
    if (currentFilters.minHp !== undefined && currentFilters.minHp !== null) {
      filtered = filtered.filter(u => u.stats.hp >= currentFilters.minHp)
    }
    if (currentFilters.maxHp !== undefined && currentFilters.maxHp !== null) {
      filtered = filtered.filter(u => u.stats.hp <= currentFilters.maxHp)
    }
    if (currentFilters.minAttack !== undefined && currentFilters.minAttack !== null) {
      filtered = filtered.filter(u => u.stats.attack >= currentFilters.minAttack)
    }
    if (currentFilters.maxAttack !== undefined && currentFilters.maxAttack !== null) {
      filtered = filtered.filter(u => u.stats.attack <= currentFilters.maxAttack)
    }
    if (currentFilters.minDefense !== undefined && currentFilters.minDefense !== null) {
      filtered = filtered.filter(u => u.stats.defense >= currentFilters.minDefense)
    }
    if (currentFilters.maxDefense !== undefined && currentFilters.maxDefense !== null) {
      filtered = filtered.filter(u => u.stats.defense <= currentFilters.maxDefense)
    }
    if (currentFilters.minSpeed !== undefined && currentFilters.minSpeed !== null) {
      filtered = filtered.filter(u => u.stats.speed >= currentFilters.minSpeed)
    }
    if (currentFilters.maxSpeed !== undefined && currentFilters.maxSpeed !== null) {
      filtered = filtered.filter(u => u.stats.speed <= currentFilters.maxSpeed)
    }

    // Sort
    if (currentFilters.sortBy) {
      filtered.sort((a, b) => {
        // Always keep Robotos before Robopets
        if (a.type === 'roboto' && b.type === 'robopet') return -1
        if (a.type === 'robopet' && b.type === 'roboto') return 1

        // Then apply the selected sort
        let comparison = 0
        switch (currentFilters.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'element':
            comparison = a.element.localeCompare(b.element)
            break
          case 'hp':
            comparison = a.stats.hp - b.stats.hp
            break
          case 'attack':
            comparison = a.stats.attack - b.stats.attack
            break
          case 'defense':
            comparison = a.stats.defense - b.stats.defense
            break
          case 'speed':
            comparison = a.stats.speed - b.stats.speed
            break
        }
        return currentFilters.sortOrder === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [processedUnits, currentFilters])

  const toggleUnitSelection = useCallback((unit: BattleUnitV3) => {
    if (selectedTeam.find(u => u.id === unit.id)) {
      setSelectedTeam(selectedTeam.filter(u => u.id !== unit.id))
      gameSounds.play('removeUnit')
    } else if (selectedTeam.length < 5) {
      setSelectedTeam([...selectedTeam, unit])
      gameSounds.play('addUnit')

      // Play team complete sound if team is now full
      if (selectedTeam.length === 4) {
        setTimeout(() => gameSounds.play('teamComplete'), 300)
      }
    } else {
      // Team is full, play cancel sound
      gameSounds.play('cancel')
    }
  }, [selectedTeam])

  const saveTeamAndBattle = useCallback(() => {
    // Save team to localStorage
    localStorage.setItem('roboto_rumble_team', JSON.stringify(selectedTeam))
    gameSounds.play('confirm')

    // Navigate to battle vs computer
    setTimeout(() => {
      router.push('/battle/training')
    }, 200)
  }, [selectedTeam, router])

  const getElementTooltip = useCallback((element: string): string => {
    switch (element) {
      case 'SURGE':
        return 'SURGE > METAL > CODE > GLITCH > SURGE'
      case 'METAL':
        return 'METAL > CODE > GLITCH > SURGE > METAL'
      case 'CODE':
        return 'CODE > GLITCH > SURGE > METAL > CODE'
      case 'GLITCH':
        return 'GLITCH > SURGE > METAL > CODE > GLITCH'
      case 'NEUTRAL':
        return 'No element advantages or disadvantages'
      default:
        return element
    }
  }, [])

  // Show loading state during hydration
  if (!mounted) {
    return (
      <PageLayout>
        <div className="text-center">
          <p className="text-green-400 text-xl animate-pulse">
            INITIALIZING TEAM BUILDER...
          </p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Full width header */}
      <GameHeader
        title="TEAM BUILDER"
        showBackButton
        backHref="/"
      />

      {/* Constrained content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6">
        {!isConnected ? (
          <Card className="bg-black/80 border-2 border-green-500 rounded-lg max-w-md mx-auto">
            <CardHeader>
              <CardTitle>AUTHENTICATION REQUIRED</CardTitle>
              <CardDescription className="text-green-400">
                Connect your wallet to access your combat units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnect />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Selected Team */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 text-green-400">
                SELECTED SQUAD ({selectedTeam.length}/5)
              </h2>
              <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, index) => {
                  const unit = selectedTeam[index]
                  const key = unit ? `selected-${unit.id}` : `empty-slot-${index}`
                  return (
                    <Card
                      key={key}
                      className={`bg-black/60 border-2 rounded-lg ${unit ? 'border-green-500 cursor-pointer hover:border-red-500 transition-colors' : 'border-green-500/30 border-dashed'} aspect-square flex items-center justify-center`}
                      onClick={() => unit && toggleUnitSelection(unit)}
                      onMouseEnter={() => unit && gameSounds.playHover()}
                    >
                      {unit ? (
                        <div className="text-center p-2">
                          <img
                            src={unit.imageUrl}
                            alt={unit.name}
                            className="w-full h-auto mb-2 pixelated"
                          />
                          <p className="text-xs text-green-400 truncate">{unit.name}</p>
                        </div>
                      ) : (
                        <p className="text-green-500/50 text-4xl">?</p>
                      )}
                    </Card>
                  )
                })}
              </div>

              {selectedTeam.length === 5 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="terminal"
                    size="lg"
                    onClick={saveTeamAndBattle}
                    className="animate-pulse rounded-lg"
                  >
                    START BATTLE
                  </Button>
                </div>
              )}

              {/* Team Elements */}
              {selectedTeam.length > 0 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="font-bold text-green-400 mb-2 justify-center text-center">
                    TEAM ELEMENTS
                  </h3>
                  <TooltipProvider>
                    <div className="flex gap-8 justify-center">
                      {selectedTeam.map((unit) => (
                        <Tooltip key={`element-${unit.id}-${unit.element}`}>
                          <TooltipTrigger asChild>
                            <div
                              className="text-center cursor-crosshair"
                              style={{ color: TraitProcessorV3.getElementColor(unit.element) }}
                            >
                              <div className="text-3xl">
                                {TraitProcessorV3.getElementSymbol(unit.element)}
                              </div>
                              <div className="text-md">
                                {unit.element}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getElementTooltip(unit.element)}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Available Units */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-400">
                  AVAILABLE UNITS
                </h2>
                {error && (
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={refetch}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    RETRY
                  </Button>
                )}
              </div>

              {/* Loading Progress */}
              {loading && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-green-400 mb-2">
                    <span>SCANNING COMBAT UNITS...</span>
                    <span>{loadingProgress}%</span>
                  </div>
                  <div className="w-full bg-black/60 border border-green-500/30 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded">
                  <p className="text-red-500">{error}</p>
                </div>
              )}

              {/* Filters - Only show when we have units */}
              {processedUnits.length > 0 && (
                <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm -mx-4 px-4 py-4 md:-mx-8 md:px-8 mb-6 border-b border-green-500/20">
                  <UnitFilters
                    onFiltersChange={setCurrentFilters}
                    unitCount={processedUnits.length}
                    filteredCount={filteredUnits.length}
                  />
                </div>
              )}

              {/* Units Grid */}
              <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredUnits.map((unit, index) => {
                  const isSelected = selectedTeam.find(u => u.id === unit.id)
                  return (
                    <Card
                      key={unit.id}
                      className={`bg-black/60 border-2 rounded-lg transition-all overflow-hidden relative ${isSelected
                        ? 'border-green-500 shadow-[0_0_20px_rgba(0,255,0,0.6)]'
                        : 'border-green-500/30 hover:border-green-500/60'
                        }`}
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      {/* Expand button */}
                      <Button
                        variant="terminal"
                        size="icon"
                        className="absolute top-2 right-2 z-10 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxIndex(index)
                          gameSounds.playClick()
                        }}
                      >
                        <Expand className="w-4 h-4" />
                      </Button>

                      <div className="flex cursor-pointer" onClick={() => toggleUnitSelection(unit)}>
                        {/* Left side - Image */}
                        <div className="w-48 h-48 flex-shrink-0 bg-black/50 border-r border-green-500/20">
                          <img
                            src={unit.imageUrl}
                            alt={unit.name}
                            className="w-full h-full object-cover pixelated"
                          />
                        </div>

                        {/* Right side - Metadata */}
                        <div className="flex-1 p-4">
                          {/* Header */}
                          <div className="mb-3">
                            <h3 className="text-lg font-bold mb-1">{unit.name}</h3>
                            <div className="text-sm" style={{ color: TraitProcessorV3.getElementColor(unit.element) }}>
                              {TraitProcessorV3.getElementSymbol(unit.element)} {unit.element}
                            </div>
                          </div>

                          {/* Stats */}
                          <TooltipProvider>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-mono">{unit.stats.hp}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Health Points - Total damage unit can take</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <Swords className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm font-mono">{unit.stats.attack}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Attack - Increases damage dealt</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-mono">{unit.stats.defense}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Defense - Reduces damage taken</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <Zap className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm font-mono">{unit.stats.speed}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Speed - Determines turn order</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <Gauge className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-mono">{unit.stats.energy}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Energy - Resource for using abilities</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help">
                                    <Sparkles className="w-4 h-4 text-pink-500" />
                                    <span className="text-sm font-mono">{unit.stats.crit}%</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Critical - Chance for 50% bonus damage</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>

                          {/* Abilities */}
                          <div className="flex flex-wrap gap-1">
                            {unit.abilities.map(abilityId => {
                              const ability = TraitProcessorV3.getAbilityData(abilityId)
                              return ability ? (
                                <div
                                  key={abilityId}
                                  className="text-xs px-2 py-1 bg-black/50 border border-green-500/30 rounded"
                                  style={{
                                    borderColor: TraitProcessorV3.getElementColor(ability.element) + '40',
                                    backgroundColor: TraitProcessorV3.getElementColor(ability.element) + '0A'
                                  }}
                                >
                                  {ability.name}
                                </div>
                              ) : null
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Empty State */}
              {!loading && processedUnits.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-green-400/60 text-lg">
                    NO COMBAT UNITS DETECTED
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <UnitLightbox
          units={filteredUnits}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onSelect={(unit) => {
            toggleUnitSelection(unit)
            setLightboxIndex(null)
          }}
          selectedTeam={selectedTeam}
        />
      )}
    </PageLayout>
  )
}