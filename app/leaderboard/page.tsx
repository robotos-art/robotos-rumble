'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Trophy, Zap, Shield, Swords } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'
import { formatAddress } from '../../lib/utils/address'
import type { LeaderboardEntry } from '../../lib/storage/types'

export default function Leaderboard() {
  const [selectedTab, setSelectedTab] = useState<'global' | 'elements'>('global')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  const elementColors = {
    SURGE: '#FFD700',
    CODE: '#00CED1',
    METAL: '#C0C0C0',
    GLITCH: '#FF1493'
  }
  
  useEffect(() => {
    fetchLeaderboard()
  }, [])
  
  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leaderboard?type=global')
      const data = await response.json()
      
      // If no real data yet, use mock data for display
      if (!data || data.length === 0) {
        // Use mock data as fallback
        const mockData: LeaderboardEntry[] = [
          { address: '0x1234567890123456789012345678901234567890', wins: 147, losses: 23, winRate: 86.5, winStreak: 8, favoriteElement: 'SURGE', lastUpdated: new Date().toISOString() },
          { address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', wins: 132, losses: 31, winRate: 81.0, winStreak: 5, favoriteElement: 'CODE', lastUpdated: new Date().toISOString() },
          { address: '0x9876543210987654321098765432109876543210', wins: 128, losses: 35, winRate: 78.5, winStreak: 3, favoriteElement: 'METAL', lastUpdated: new Date().toISOString() },
          { address: '0xFEDCBA9876543210FEDCBA9876543210FEDCBA98', wins: 115, losses: 42, winRate: 73.2, winStreak: 2, favoriteElement: 'GLITCH', lastUpdated: new Date().toISOString() },
          { address: '0x1111222233334444555566667777888899990000', wins: 98, losses: 47, winRate: 67.6, winStreak: 1, favoriteElement: 'SURGE', lastUpdated: new Date().toISOString() },
        ]
        setLeaderboardData(mockData)
      } else {
        setLeaderboardData(data)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-green-400">
                        Loading leaderboard data...
                      </td>
                    </tr>
                  ) : leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-green-400/60">
                        No battles recorded yet. Be the first to claim the top spot!
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.map((entry, index) => (
                      <tr 
                        key={entry.address}
                        className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors"
                        onMouseEnter={() => gameSounds.playHover()}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                            {index === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
                            {index === 2 && <Trophy className="w-5 h-5 text-orange-600" />}
                            <span className="font-mono text-lg">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono">
                          <div className="flex flex-col">
                            <span className="text-green-400">
                              {entry.displayName || formatAddress(entry.address, 'medium')}
                            </span>
                            {entry.displayName && (
                              <span className="text-xs text-gray-500">
                                {formatAddress(entry.address, 'short')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono text-green-400">{entry.wins}</td>
                        <td className="p-4 text-center font-mono text-red-400">{entry.losses}</td>
                        <td className="p-4 text-center font-mono">{entry.winRate.toFixed(1)}%</td>
                        <td className="p-4 text-center">
                          {entry.favoriteElement && (
                            <span 
                              className="font-mono"
                              style={{ color: elementColors[entry.favoriteElement as keyof typeof elementColors] }}
                            >
                              {entry.favoriteElement}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
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
        
        {/* Live Data Notice */}
        <div className="mt-8 text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-500">
            🎮 LIVE RANKINGS - Battle to climb the leaderboard!
          </p>
        </div>
      </div>
    </PageLayout>
  )
}