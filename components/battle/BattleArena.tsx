'use client'

import { useState, useEffect } from 'react'
import { BattleUnitV3, TraitProcessorV3 } from '../../lib/game-engine/TraitProcessorV3'
import BattleArenaV3 from './BattleArenaV3'
import sampleRobotoDatabase from '../../lib/data/sample-roboto-database.json'

interface BattleArenaProps {
  playerTeam: BattleUnitV3[]
  onBattleEnd: (won: boolean) => void
}

export default function BattleArena({ playerTeam, onBattleEnd }: BattleArenaProps) {
  const [enemyTeam, setEnemyTeam] = useState<BattleUnitV3[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate enemy team from sample database
    const generateEnemyTeam = () => {
      const enemies: BattleUnitV3[] = []
      const usedIndices = new Set<number>()
      
      // Pick 5 random Robotos from the database
      while (enemies.length < 5) {
        const randomIndex = Math.floor(Math.random() * sampleRobotoDatabase.length)
        if (usedIndices.has(randomIndex)) continue
        
        usedIndices.add(randomIndex)
        const roboto = sampleRobotoDatabase[randomIndex]
        
        const battleUnit = TraitProcessorV3.processRobotoTraits({
          tokenId: roboto.tokenId,
          name: roboto.name,
          image: roboto.image,
          attributes: roboto.attributes
        })
        
        enemies.push(battleUnit)
      }
      
      return enemies
    }
    
    setEnemyTeam(generateEnemyTeam())
    setLoading(false)
  }, [])
  
  if (loading || enemyTeam.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-green-400 text-xl animate-pulse">
          LOADING BATTLE ARENA...
        </p>
      </div>
    )
  }
  
  return (
    <BattleArenaV3 
      playerTeam={playerTeam}
      enemyTeam={enemyTeam}
      onBattleEnd={onBattleEnd}
    />
  )
}