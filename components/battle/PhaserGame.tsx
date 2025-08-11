'use client'

import { useEffect, useRef } from 'react'
import { BattleUnitV3 } from '../../lib/game-engine/TraitProcessorV3'

interface PhaserGameProps {
  playerTeam: BattleUnitV3[]
  enemyTeam: BattleUnitV3[]
  onBattleEnd: (won: boolean) => void
}

export default function PhaserGame({ playerTeam, enemyTeam, onBattleEnd }: PhaserGameProps) {
  const gameRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    // Dynamic import to avoid SSR issues
    import('phaser').then((Phaser) => {
      import('./scenes/BattleSceneV2').then(({ BattleSceneV2 }) => {
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.default.AUTO,
          parent: containerRef.current!,
          width: 1920,
          height: 1080,
          backgroundColor: '#000000',
          pixelArt: true,
          scene: [BattleSceneV2],
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { x: 0, y: 0 },
              debug: false
            }
          },
          scale: {
            mode: Phaser.default.Scale.RESIZE,
            autoCenter: Phaser.default.Scale.CENTER_BOTH,
            parent: containerRef.current!
          }
        }

        // Pass data to the scene
        config.scene = new BattleSceneV2({
          playerTeam,
          enemyTeam,
          onBattleEnd
        })

        gameRef.current = new Phaser.default.Game(config)
      })
    })

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [playerTeam, enemyTeam, onBattleEnd])

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full object-contain"
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    />
  )
}