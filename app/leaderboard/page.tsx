'use client'

import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'
import { LeaderboardRow } from '../../components/leaderboard/LeaderboardRow'
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
                      <LeaderboardRow key={entry.address} entry={entry} index={index} />
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