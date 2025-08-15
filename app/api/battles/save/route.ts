import { NextRequest, NextResponse } from 'next/server'
import { StorageService } from '@/lib/storage/storage-service'
import { checkAchievements } from '@/lib/achievements/checker'
import { normalizeAddress } from '@/lib/utils/address'
import type { BattleRecord } from '@/lib/storage/types'

export const dynamic = 'force-dynamic'

const storage = new StorageService()

export async function POST(request: NextRequest) {
  try {
    const battleData: BattleRecord = await request.json()
    
    // Validate battle data
    if (!battleData.playerAddress || !battleData.result) {
      return NextResponse.json(
        { error: 'Invalid battle data' },
        { status: 400 }
      )
    }
    
    const normalizedAddress = normalizeAddress(battleData.playerAddress)
    battleData.playerAddress = normalizedAddress
    
    // Generate battle ID if not provided
    if (!battleData.id) {
      battleData.id = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // Save battle record
    await storage.saveBattle(battleData)
    
    // Get or create player profile
    let profile = await storage.getProfile(normalizedAddress)
    if (!profile) {
      profile = await storage.createNewProfile(normalizedAddress)
    }
    
    // Update stats
    const oldStats = { ...profile.stats }
    profile.stats.totalBattles++
    
    if (battleData.result === 'victory') {
      profile.stats.wins++
      profile.stats.winStreak++
      profile.stats.bestWinStreak = Math.max(
        profile.stats.bestWinStreak,
        profile.stats.winStreak
      )
    } else {
      profile.stats.losses++
      profile.stats.winStreak = 0
    }
    
    // Update cumulative stats
    profile.stats.totalDamageDealt += battleData.damageDealt || 0
    profile.stats.totalDamageReceived += battleData.damageReceived || 0
    
    // Calculate new average battle duration
    const totalDuration = (profile.stats.averageBattleDuration * oldStats.totalBattles) + battleData.duration
    profile.stats.averageBattleDuration = Math.round(totalDuration / profile.stats.totalBattles)
    
    // Update favorite element (most used)
    const elementCounts: Record<string, number> = {}
    battleData.elementsUsed.forEach(element => {
      elementCounts[element] = (elementCounts[element] || 0) + 1
    })
    const mostUsedElement = Object.entries(elementCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0]
    if (mostUsedElement) {
      profile.stats.favoriteElement = mostUsedElement
    }
    
    // Check for paired team victory
    if (battleData.result === 'victory') {
      const robotos = battleData.teamUsed.filter(u => u.type === 'roboto')
      const robopets = battleData.teamUsed.filter(u => u.type === 'robopet')
      
      let hasPairedTeam = false
      robotos.forEach(roboto => {
        const robotoId = roboto.id.replace(/^roboto-/, '')
        if (robopets.some(pet => pet.id.replace(/^robopet-/, '') === robotoId)) {
          hasPairedTeam = true
        }
      })
      
      if (hasPairedTeam) {
        profile.stats.pairedVictories = (profile.stats.pairedVictories || 0) + 1
      }
    }
    
    // Update last seen
    profile.lastSeenAt = new Date().toISOString()
    
    // Check for new achievements
    const newAchievements = checkAchievements(
      battleData,
      profile.stats,
      profile.achievements
    )
    
    if (newAchievements.length > 0) {
      profile.achievements.push(...newAchievements)
    }
    
    // Check for badges (simple milestone badges)
    const newBadges: string[] = []
    
    // Battle count badges
    if (profile.stats.totalBattles >= 10 && !profile.badges.some(b => b.id === 'recruit')) {
      profile.badges.push({
        id: 'recruit',
        tier: 'bronze',
        earnedAt: new Date().toISOString()
      })
      newBadges.push('recruit')
    }
    
    if (profile.stats.totalBattles >= 50 && !profile.badges.some(b => b.id === 'soldier')) {
      profile.badges.push({
        id: 'soldier',
        tier: 'silver',
        earnedAt: new Date().toISOString()
      })
      newBadges.push('soldier')
    }
    
    if (profile.stats.totalBattles >= 100 && !profile.badges.some(b => b.id === 'veteran')) {
      profile.badges.push({
        id: 'veteran',
        tier: 'gold',
        earnedAt: new Date().toISOString()
      })
      newBadges.push('veteran')
    }
    
    // Win rate badges (minimum 20 battles)
    if (profile.stats.totalBattles >= 20) {
      const winRate = (profile.stats.wins / profile.stats.totalBattles) * 100
      
      if (winRate >= 60 && !profile.badges.some(b => b.id === 'skilled')) {
        profile.badges.push({
          id: 'skilled',
          tier: 'bronze',
          earnedAt: new Date().toISOString()
        })
        newBadges.push('skilled')
      }
      
      if (winRate >= 70 && !profile.badges.some(b => b.id === 'expert')) {
        profile.badges.push({
          id: 'expert',
          tier: 'silver',
          earnedAt: new Date().toISOString()
        })
        newBadges.push('expert')
      }
      
      if (winRate >= 80 && !profile.badges.some(b => b.id === 'master')) {
        profile.badges.push({
          id: 'master',
          tier: 'gold',
          earnedAt: new Date().toISOString()
        })
        newBadges.push('master')
      }
    }
    
    // Save updated profile
    await storage.saveProfile(profile)
    
    // TODO: Update leaderboard position in Edge Config (would be done by a separate service)
    
    return NextResponse.json({
      success: true,
      newAchievements,
      newBadges,
      profile
    })
  } catch (error) {
    console.error('Error saving battle:', error)
    return NextResponse.json(
      { error: 'Failed to save battle' },
      { status: 500 }
    )
  }
}