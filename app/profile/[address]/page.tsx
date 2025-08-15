'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Trophy, Target, Zap, Shield, Award, TrendingUp, Clock, Swords, Share2, ArrowLeft } from 'lucide-react'
import { GameHeader } from '../../../components/shared/GameHeader'
import { PageLayout } from '../../../components/shared/PageLayout'
import type { PlayerProfile } from '../../../lib/storage/types'
import achievementsData from '../../../lib/data/achievements.json'

interface ProfilePageProps {
  params: {
    address: string
  }
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter()
  const { address: connectedAddress } = useAccount()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const profileAddress = params.address
  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress?.toLowerCase()

  useEffect(() => {
    if (profileAddress) {
      fetchProfile()
    }
  }, [profileAddress])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/player/${profileAddress}`)
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

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <GameHeader title="PROFILE" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="terminal-text animate-pulse">LOADING PROFILE...</div>
        </div>
      </PageLayout>
    )
  }

  if (!profile) {
    return (
      <PageLayout>
        <GameHeader title="PROFILE" />
        <div className="flex items-center justify-center min-h-screen">
          <Card className="terminal-card max-w-md">
            <CardHeader>
              <CardTitle>No Profile Found</CardTitle>
              <CardDescription>This player hasn&apos;t played any battles yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
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
      <GameHeader title={isOwnProfile ? "MY PROFILE" : "PLAYER PROFILE"} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="terminal-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {profile.displayName || `${profileAddress?.slice(0, 6)}...${profileAddress?.slice(-4)}`}
                  </CardTitle>
                  <CardDescription>
                    Member since {new Date(profile.createdAt).toLocaleDateString()}
                  </CardDescription>
                  {!isOwnProfile && (
                    <div className="mt-2 text-xs text-green-400/70">
                      Viewing {profileAddress}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Share'}
                  </Button>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-400">{winRate}%</div>
                    <div className="text-sm text-gray-400">Win Rate</div>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(achievementsData).map((achievement: any) => {
                  const earned = profile.achievements.includes(achievement.id)
                  const tierColors = {
                    bronze: 'border-orange-600 bg-orange-600/10 text-orange-400',
                    silver: 'border-gray-400 bg-gray-400/10 text-gray-300',
                    gold: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
                    platinum: 'border-purple-400 bg-purple-400/10 text-purple-300',
                    diamond: 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                  }
                  const tierColor = tierColors[achievement.tier as keyof typeof tierColors] || tierColors.bronze
                  
                  return (
                    <div
                      key={achievement.id}
                      className={`p-3 rounded border transition-all ${
                        earned 
                          ? tierColor
                          : 'border-gray-700 bg-gray-800/50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{achievement.icon}</span>
                          <div>
                            <div className="text-sm font-bold">{achievement.name}</div>
                            <div className="text-xs opacity-80">{achievement.tier?.toUpperCase() || 'BRONZE'}</div>
                          </div>
                        </div>
                        <div className="text-xs font-bold">+{achievement.points}</div>
                      </div>
                      <div className="text-xs opacity-70">{achievement.description}</div>
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
            {isOwnProfile ? (
              <>
                <Button onClick={() => router.push('/battle')} size="lg">
                  Battle Again
                </Button>
                <Button onClick={() => router.push('/leaderboard')} variant="outline" size="lg">
                  View Leaderboard
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => router.push('/leaderboard')} size="lg">
                  View Leaderboard
                </Button>
                <Button onClick={() => router.push('/')} variant="outline" size="lg">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}