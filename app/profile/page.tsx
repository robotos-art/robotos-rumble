'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Trophy, Target, Zap, Shield, Award, TrendingUp, Clock, Swords } from 'lucide-react'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'
import type { PlayerProfile } from '../../lib/storage/types'
import achievementsData from '../../lib/data/achievements.json'

export default function ProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected || !address) {
      router.push('/')
      return
    }

    fetchProfile()
  }, [address, isConnected])

  const fetchProfile = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/player/${address}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <GameHeader />
        <div className="flex items-center justify-center min-h-screen">
          <div className="terminal-text animate-pulse">LOADING PROFILE...</div>
        </div>
      </PageLayout>
    )
  }

  if (!profile) {
    return (
      <PageLayout>
        <GameHeader />
        <div className="flex items-center justify-center min-h-screen">
          <Card className="terminal-card max-w-md">
            <CardHeader>
              <CardTitle>No Profile Found</CardTitle>
              <CardDescription>Play your first battle to create a profile!</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/battle')} className="w-full">
                Start Battle
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    )
  }

  const winRate = profile.stats.totalBattles > 0 
    ? Math.round((profile.stats.wins / profile.stats.totalBattles) * 100)
    : 0

  return (
    <PageLayout>
      <GameHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="terminal-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {profile.displayName || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </CardTitle>
                  <CardDescription>
                    Member since {new Date(profile.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-400">{winRate}%</div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-bold">{profile.stats.wins}</div>
                    <div className="text-sm text-gray-400">Victories</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Swords className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold">{profile.stats.totalBattles}</div>
                    <div className="text-sm text-gray-400">Total Battles</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold">{profile.stats.winStreak}</div>
                    <div className="text-sm text-gray-400">Current Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold">{profile.stats.totalDamageDealt}</div>
                    <div className="text-sm text-gray-400">Damage Dealt</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combat Stats */}
          <Card className="terminal-card">
            <CardHeader>
              <CardTitle>Combat Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Best Win Streak</div>
                  <div className="text-xl font-bold">{profile.stats.bestWinStreak}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Avg Battle Duration</div>
                  <div className="text-xl font-bold">{profile.stats.averageBattleDuration}s</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Favorite Element</div>
                  <div className="text-xl font-bold">{profile.stats.favoriteElement || 'None'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Damage Dealt</div>
                  <div className="text-xl font-bold">{profile.stats.totalDamageDealt}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Damage Received</div>
                  <div className="text-xl font-bold">{profile.stats.totalDamageReceived}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">K/D Ratio</div>
                  <div className="text-xl font-bold">
                    {profile.stats.totalDamageReceived > 0 
                      ? (profile.stats.totalDamageDealt / profile.stats.totalDamageReceived).toFixed(2)
                      : '∞'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="terminal-card">
            <CardHeader>
              <CardTitle>Achievements ({profile.achievements.length}/{Object.keys(achievementsData).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.values(achievementsData).map((achievement: any) => {
                  const earned = profile.achievements.includes(achievement.id)
                  return (
                    <div
                      key={achievement.id}
                      className={`p-3 rounded border ${
                        earned 
                          ? 'border-green-500 bg-green-500/10' 
                          : 'border-gray-700 bg-gray-800/50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Award className={`w-4 h-4 ${earned ? 'text-green-400' : 'text-gray-500'}`} />
                        <div className="text-sm font-bold">{achievement.name}</div>
                      </div>
                      <div className="text-xs text-gray-400">{achievement.description}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <Card className="terminal-card">
              <CardHeader>
                <CardTitle>Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className={`px-3 py-1 rounded border ${
                        badge.tier === 'gold' 
                          ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300' 
                          : badge.tier === 'silver' 
                          ? 'border-gray-400 bg-gray-400/20 text-gray-300'
                          : 'border-orange-600 bg-orange-600/20 text-orange-300'
                      }`}
                    >
                      {badge.id.replace('_', ' ').toUpperCase()} - {badge.tier}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={() => router.push('/battle')} size="lg">
              Battle Again
            </Button>
            <Button onClick={() => router.push('/leaderboard')} variant="outline" size="lg">
              View Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}