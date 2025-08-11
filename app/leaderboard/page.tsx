'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Trophy, Zap, Shield, Swords } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'

// Mock data for now
const mockLeaderboard = [
  { rank: 1, address: '0x1234...5678', wins: 147, losses: 23, winRate: 86.5, topElement: 'SURGE' },
  { rank: 2, address: '0xABCD...EFGH', wins: 132, losses: 31, winRate: 81.0, topElement: 'CODE' },
  { rank: 3, address: '0x9876...5432', wins: 128, losses: 35, winRate: 78.5, topElement: 'METAL' },
  { rank: 4, address: '0xFEDC...BA98', wins: 115, losses: 42, winRate: 73.2, topElement: 'GLITCH' },
  { rank: 5, address: '0x1111...2222', wins: 98, losses: 47, winRate: 67.6, topElement: 'SURGE' },
]

export default function Leaderboard() {
  const [selectedTab, setSelectedTab] = useState<'global' | 'elements'>('global')
  
  const elementColors = {
    SURGE: '#FFD700',
    CODE: '#00CED1',
    METAL: '#C0C0C0',
    GLITCH: '#FF1493'
  }
  
  return (
    <PageLayout>
      <GameHeader 
        title="LEADERBOARD"
        showBackButton
        backHref="/"
      />
      
      <div className="mt-8">
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="terminal"
            size="sm"
            onClick={() => {
              setSelectedTab('global')
              gameSounds.playClick()
            }}
            className={selectedTab === 'global' ? 'bg-green-500/20' : 'opacity-60'}
          >
            GLOBAL RANKINGS
          </Button>
          <Button
            variant="terminal"
            size="sm"
            onClick={() => {
              setSelectedTab('elements')
              gameSounds.playClick()
            }}
            className={selectedTab === 'elements' ? 'bg-green-500/20' : 'opacity-60'}
          >
            ELEMENT STATISTICS
          </Button>
        </div>
        
        {selectedTab === 'global' ? (
          <Card className="bg-black/80 border-2 border-green-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-green-500/30 text-green-400">
                    <th className="text-left p-4">RANK</th>
                    <th className="text-left p-4">PILOT</th>
                    <th className="text-center p-4">WINS</th>
                    <th className="text-center p-4">LOSSES</th>
                    <th className="text-center p-4">WIN RATE</th>
                    <th className="text-center p-4">MAIN ELEMENT</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLeaderboard.map((entry) => (
                    <tr 
                      key={entry.rank}
                      className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors"
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {entry.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                          {entry.rank === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
                          {entry.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
                          <span className="font-mono text-lg">#{entry.rank}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono">{entry.address}</td>
                      <td className="p-4 text-center font-mono text-green-400">{entry.wins}</td>
                      <td className="p-4 text-center font-mono text-red-400">{entry.losses}</td>
                      <td className="p-4 text-center font-mono">{entry.winRate}%</td>
                      <td className="p-4 text-center">
                        <span 
                          className="font-mono"
                          style={{ color: elementColors[entry.topElement as keyof typeof elementColors] }}
                        >
                          {entry.topElement}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(elementColors).map(([element, color]) => (
              <Card 
                key={element}
                className="bg-black/80 border-2 rounded-lg p-6 text-center"
                style={{ borderColor: color + '80' }}
                onMouseEnter={() => gameSounds.playHover()}
              >
                <h3 className="text-2xl font-bold mb-4" style={{ color }}>
                  {element}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-green-400">TOTAL BATTLES: 1,245</p>
                  <p className="text-green-400">WIN RATE: 52.3%</p>
                  <p className="text-green-400">MOST USED: 18.5%</p>
                  <p className="text-green-400">TOP ABILITY: SURGE STRIKE</p>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* Coming Soon Notice */}
        <div className="mt-8 text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-500">
            LIVE RANKINGS COMING SOON - CURRENTLY SHOWING SIMULATED DATA
          </p>
        </div>
      </div>
    </PageLayout>
  )
}