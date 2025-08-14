import type { BattleRecord, PlayerStats } from '../storage/types'
import achievements from '../data/achievements.json'

export interface Achievement {
  id: string
  name: string
  description: string
  points: number
  icon: string
}

export function checkAchievements(
  battleResult: BattleRecord,
  playerStats: PlayerStats,
  currentAchievements: string[]
): string[] {
  const newAchievements: string[] = []

  // First Blood - First victory
  if (!currentAchievements.includes('first_blood') && 
      battleResult.result === 'victory' && 
      playerStats.wins === 1) {
    newAchievements.push('first_blood')
  }

  // Winning Streaks
  if (!currentAchievements.includes('winning_streak_3') && 
      playerStats.winStreak >= 3) {
    newAchievements.push('winning_streak_3')
  }

  if (!currentAchievements.includes('winning_streak_5') && 
      playerStats.winStreak >= 5) {
    newAchievements.push('winning_streak_5')
  }

  if (!currentAchievements.includes('winning_streak_10') && 
      playerStats.winStreak >= 10) {
    newAchievements.push('winning_streak_10')
  }

  // Battle Veteran achievements
  if (!currentAchievements.includes('battle_veteran_10') && 
      playerStats.totalBattles >= 10) {
    newAchievements.push('battle_veteran_10')
  }

  if (!currentAchievements.includes('battle_veteran_50') && 
      playerStats.totalBattles >= 50) {
    newAchievements.push('battle_veteran_50')
  }

  if (!currentAchievements.includes('battle_veteran_100') && 
      playerStats.totalBattles >= 100) {
    newAchievements.push('battle_veteran_100')
  }

  // Perfect Victory - Win without losing units
  if (!currentAchievements.includes('perfect_victory') && 
      battleResult.result === 'victory') {
    // Check if all team members survived (needs additional data from battle)
    // For now, check if damage received is very low
    if (battleResult.damageReceived === 0) {
      newAchievements.push('perfect_victory')
    }
  }

  // Speed Demon - Win in under 60 seconds
  if (!currentAchievements.includes('speed_demon') && 
      battleResult.result === 'victory' && 
      battleResult.duration < 60) {
    newAchievements.push('speed_demon')
  }

  // Element Diversity - Use all 4 elements
  if (!currentAchievements.includes('element_diversity') && 
      battleResult.result === 'victory') {
    const uniqueElements = new Set(battleResult.elementsUsed)
    if (uniqueElements.size >= 4) {
      newAchievements.push('element_diversity')
    }
  }

  // Companion Synergy - Win with 3+ companion pairs
  if (!currentAchievements.includes('companion_synergy') && 
      battleResult.result === 'victory') {
    // Count companion pairs in team
    const robotos = battleResult.teamUsed.filter(u => u.type === 'roboto')
    const robopets = battleResult.teamUsed.filter(u => u.type === 'robopet')
    
    let companionPairs = 0
    robotos.forEach(roboto => {
      const robotoId = roboto.id.replace(/^roboto-/, '')
      if (robopets.some(pet => pet.id.replace(/^robopet-/, '') === robotoId)) {
        companionPairs++
      }
    })
    
    if (companionPairs >= 3) {
      newAchievements.push('companion_synergy')
    }
  }

  // Damage Dealer - Deal 500+ damage
  if (!currentAchievements.includes('damage_dealer_500') && 
      battleResult.damageDealt >= 500) {
    newAchievements.push('damage_dealer_500')
  }

  // Tank Master - Win while taking less than 100 damage
  if (!currentAchievements.includes('tank_master') && 
      battleResult.result === 'victory' && 
      battleResult.damageReceived < 100) {
    newAchievements.push('tank_master')
  }

  return newAchievements
}

export function getAchievementDetails(achievementId: string): Achievement | null {
  return (achievements as any)[achievementId] || null
}

export function getAllAchievements(): Achievement[] {
  return Object.values(achievements)
}