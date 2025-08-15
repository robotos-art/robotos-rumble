'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Trophy, Zap, Shield, Swords, User } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'
import { formatAddress } from '../../lib/utils/address'
import type { LeaderboardEntry } from '../../lib/storage/types'

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchLeaderboard()
  }, [])
  
  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leaderboard?type=global')
      const data = await response.json()
      
      // Always use real data from Vercel Blob
      setLeaderboardData(data || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
      setLeaderboardData([])
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
        
        {/* Global Rankings */}
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
                        className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors cursor-pointer"
                        onMouseEnter={() => gameSounds.playHover()}
                        onClick={() => gameSounds.playClick()}
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
                          <Link 
                            href={`/profile/${entry.address}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {entry.avatar ? (
                                <img
                                  src={
                                    entry.avatar.type === 'roboto'
                                      ? `https://d2lp2vbc3umjmr.cloudfront.net/${entry.avatar.tokenId}/roboto-transparent.png`
                                      : entry.avatar.imageUrl || ''
                                  }
                                  alt="Avatar"
                                  className="w-10 h-10 rounded border border-green-500/30"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                    const fallback = target.nextElementSibling as HTMLElement
                                    if (fallback) fallback.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-10 h-10 rounded border border-green-500/30 bg-green-500/10 items-center justify-center"
                                style={{ display: entry.avatar ? 'none' : 'flex' }}
                              >
                                <User className="w-5 h-5 text-green-500/50" />
                              </div>
                            </div>
                            {/* Name */}
                            <div className="flex flex-col">
                              <span className="text-green-400">
                                {entry.ensName || entry.displayName || formatAddress(entry.address, 'medium')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatAddress(entry.address, 'short')}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="p-4 text-center font-mono text-green-400">{entry.wins}</td>
                        <td className="p-4 text-center font-mono text-red-400">{entry.losses}</td>
                        <td className="p-4 text-center font-mono">{entry.winRate.toFixed(1)}%</td>
                        <td className="p-4 text-center">
                          {entry.favoriteElement && (
                            <span className="font-mono text-green-400">
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
        
        {/* Live Data Notice */}
        <div className="mt-8 text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-500">
            🎮 LIVE RANKINGS - Battle to climb the leaderboard!
          </p>
        </div>
        </div>
      </div>
    </PageLayout>
  )
}