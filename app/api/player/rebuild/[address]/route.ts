import { NextRequest, NextResponse } from 'next/server'
import { StorageService } from '../../../../../lib/storage/storage-service'
import { normalizeAddress } from '../../../../../lib/utils/address'

export const dynamic = 'force-dynamic'

const storage = new StorageService()

export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const normalizedAddress = normalizeAddress(params.address)
    
    // Get battle history
    const battles = await storage.getBattleHistory(normalizedAddress, 100)
    
    if (!battles || battles.length === 0) {
      return NextResponse.json({ 
        error: 'No battle history found',
        address: normalizedAddress 
      }, { status: 404 })
    }
    
    // Create new profile from battle history
    let profile = await storage.createNewProfile(normalizedAddress)
    
    // Rebuild stats from battles
    let totalDamageDealt = 0
    let totalDamageReceived = 0
    let totalDuration = 0
    let wins = 0
    let losses = 0
    let currentStreak = 0
    let bestStreak = 0
    const elementCounts: Record<string, number> = {}
    
    // Process battles in chronological order
    const sortedBattles = battles.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    for (const battle of sortedBattles) {
      totalDamageDealt += battle.damageDealt || 0
      totalDamageReceived += battle.damageReceived || 0
      totalDuration += battle.duration || 0
      
      if (battle.result === 'victory') {
        wins++
        currentStreak++
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        losses++
        currentStreak = 0
      }
      
      // Count elements used
      battle.elementsUsed?.forEach(element => {
        elementCounts[element] = (elementCounts[element] || 0) + 1
      })
    }
    
    // Update profile stats
    profile.stats = {
      totalBattles: battles.length,
      wins,
      losses,
      winStreak: currentStreak,
      bestWinStreak: bestStreak,
      totalDamageDealt,
      totalDamageReceived,
      favoriteElement: Object.entries(elementCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      favoriteRoboto: null,
      averageBattleDuration: battles.length > 0 ? Math.round(totalDuration / battles.length) : 0
    }
    
    // Check for achievements based on rebuilt stats
    const achievements: string[] = []
    
    if (wins >= 1) achievements.push('first_blood')
    if (bestStreak >= 3) achievements.push('winning_streak_3')
    if (bestStreak >= 5) achievements.push('winning_streak_5')
    if (bestStreak >= 10) achievements.push('winning_streak_10')
    if (totalDamageDealt >= 500) achievements.push('damage_dealer_500')
    if (totalDamageDealt >= 2000) achievements.push('damage_dealer_2000')
    if (totalDamageDealt >= 5000) achievements.push('damage_dealer_5000')
    if (totalDamageDealt >= 10000) achievements.push('damage_dealer_10000')
    
    profile.achievements = achievements
    
    // Save rebuilt profile
    await storage.saveProfile(profile)
    
    return NextResponse.json({
      success: true,
      message: `Profile rebuilt from ${battles.length} battles`,
      profile
    })
    
  } catch (error) {
    console.error('Error rebuilding profile:', error)
    return NextResponse.json(
      { error: 'Failed to rebuild profile' },
      { status: 500 }
    )
  }
}