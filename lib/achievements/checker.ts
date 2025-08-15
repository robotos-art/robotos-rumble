import type { BattleRecord, PlayerStats } from '../storage/types'
import achievements from '../data/achievements.json'

export interface Achievement {
  id: string
  name: string
  description: string
  points: number
  icon: string
  tier?: string
}

export function checkAchievements(
  battleResult: BattleRecord,
  playerStats: PlayerStats,
  currentAchievements: string[]
): string[] {
  const newAchievements: string[] = []

  // Helper function to check and add achievement
  const checkAndAdd = (id: string, condition: boolean) => {
    if (!currentAchievements.includes(id) && condition) {
      newAchievements.push(id)
    }
  }

  // First Blood - First victory
  checkAndAdd('first_blood', 
    battleResult.result === 'victory' && playerStats.wins === 1)

  // === WINNING STREAKS ===
  checkAndAdd('winning_streak_3', playerStats.winStreak >= 3)
  checkAndAdd('winning_streak_5', playerStats.winStreak >= 5)
  checkAndAdd('winning_streak_10', playerStats.winStreak >= 10)
  checkAndAdd('winning_streak_20', playerStats.winStreak >= 20)
  checkAndAdd('winning_streak_50', playerStats.winStreak >= 50)
  checkAndAdd('winning_streak_100', playerStats.winStreak >= 100)

  // === TOTAL WINS ===
  checkAndAdd('total_wins_5', playerStats.wins >= 5)
  checkAndAdd('total_wins_10', playerStats.wins >= 10)
  checkAndAdd('total_wins_25', playerStats.wins >= 25)
  checkAndAdd('total_wins_50', playerStats.wins >= 50)
  checkAndAdd('total_wins_100', playerStats.wins >= 100)
  checkAndAdd('total_wins_250', playerStats.wins >= 250)
  checkAndAdd('total_wins_500', playerStats.wins >= 500)

  // === BATTLE VETERAN ===
  checkAndAdd('battle_veteran_10', playerStats.totalBattles >= 10)
  checkAndAdd('battle_veteran_50', playerStats.totalBattles >= 50)
  checkAndAdd('battle_veteran_100', playerStats.totalBattles >= 100)
  checkAndAdd('battle_veteran_500', playerStats.totalBattles >= 500)

  // === DAMAGE ACHIEVEMENTS ===
  // Single battle damage
  checkAndAdd('damage_dealer_500', battleResult.damageDealt >= 500)
  checkAndAdd('damage_dealer_1000', battleResult.damageDealt >= 1000)
  checkAndAdd('damage_dealer_2000', battleResult.damageDealt >= 2000)
  
  // Total damage dealt
  checkAndAdd('damage_total_10000', playerStats.totalDamageDealt >= 10000)
  checkAndAdd('damage_total_50000', playerStats.totalDamageDealt >= 50000)
  checkAndAdd('damage_total_100000', playerStats.totalDamageDealt >= 100000)
  checkAndAdd('damage_total_500000', playerStats.totalDamageDealt >= 500000)

  // === PERFECT VICTORIES ===
  checkAndAdd('perfect_victory', 
    battleResult.result === 'victory' && battleResult.damageReceived === 0)
  
  // Perfect streak (would need to track this separately)
  // For now, check if last 3 battles were perfect
  if (battleResult.result === 'victory' && 
      battleResult.damageReceived === 0 &&
      playerStats.winStreak >= 3) {
    // Simple heuristic: if on a 3+ win streak with no damage
    checkAndAdd('perfect_streak_3', true)
  }

  // === SPEED ACHIEVEMENTS ===
  if (battleResult.result === 'victory') {
    checkAndAdd('speed_demon_60', battleResult.duration < 60)
    checkAndAdd('speed_demon_30', battleResult.duration < 30)
    checkAndAdd('speed_demon_15', battleResult.duration < 15)
  }

  // === ELEMENT ACHIEVEMENTS ===
  // Element diversity
  if (battleResult.result === 'victory') {
    const uniqueElements = new Set(battleResult.elementsUsed)
    checkAndAdd('element_diversity', uniqueElements.size >= 4)
    
    // Element mastery (need to track element-specific wins)
    // For now, check if favorite element matches and has enough wins
    if (playerStats.favoriteElement === 'SURGE' && playerStats.wins >= 10) {
      checkAndAdd('element_master_surge', true)
    }
    if (playerStats.favoriteElement === 'CODE' && playerStats.wins >= 10) {
      checkAndAdd('element_master_code', true)
    }
    if (playerStats.favoriteElement === 'METAL' && playerStats.wins >= 10) {
      checkAndAdd('element_master_metal', true)
    }
    if (playerStats.favoriteElement === 'GLITCH' && playerStats.wins >= 10) {
      checkAndAdd('element_master_glitch', true)
    }
  }

  // === SPECIAL ACHIEVEMENTS ===
  // Time-based achievements
  const battleTime = new Date(battleResult.timestamp)
  const hour = battleTime.getHours()
  const day = battleTime.getDay()
  
  checkAndAdd('early_bird', hour < 8 && playerStats.totalBattles === 1)
  checkAndAdd('night_owl', hour >= 0 && hour < 6)
  checkAndAdd('weekend_warrior', 
    (day === 0 || day === 6) && battleResult.result === 'victory' && playerStats.wins >= 10)

  // Companion Synergy and Paired Victories
  if (battleResult.result === 'victory') {
    const robotos = battleResult.teamUsed.filter(u => u.type === 'roboto')
    const robopets = battleResult.teamUsed.filter(u => u.type === 'robopet')
    
    let companionPairs = 0
    robotos.forEach(roboto => {
      const robotoId = roboto.id.replace(/^roboto-/, '')
      if (robopets.some(pet => pet.id.replace(/^robopet-/, '') === robotoId)) {
        companionPairs++
      }
    })
    
    // Check for any paired victory
    const hasPairedTeam = companionPairs > 0
    checkAndAdd('paired_victory', hasPairedTeam)
    
    // Check for 3+ pairs
    checkAndAdd('companion_synergy', companionPairs >= 3)
    
    // Check for paired victories milestones
    const pairedVictories = playerStats.pairedVictories || 0
    if (hasPairedTeam) {
      checkAndAdd('paired_champion_5', pairedVictories >= 5)
      checkAndAdd('paired_champion_10', pairedVictories >= 10)
      checkAndAdd('paired_champion_25', pairedVictories >= 25)
      checkAndAdd('paired_champion_50', pairedVictories >= 50)
      
      // Check for perfect paired victory
      checkAndAdd('paired_perfect', battleResult.damageReceived === 0)
    }
  }

  // Tank Master
  checkAndAdd('tank_master', 
    battleResult.result === 'victory' && battleResult.damageReceived < 100)

  // Note: The following achievements would need additional battle tracking:
  // - comeback_kid (need to track units remaining)
  // - survivor (need to track remaining HP)
  // - critical_striker (need to track critical hits)
  // - status_master (need to track status effects)
  // - dodge_master (need to track dodges)
  // These can be implemented when we add more detailed battle tracking

  return newAchievements
}

export function getAchievementDetails(achievementId: string): Achievement | null {
  return (achievements as any)[achievementId] || null
}

export function getAllAchievements(): Achievement[] {
  return Object.values(achievements)
}

export function getAchievementsByTier(tier: string): Achievement[] {
  return Object.values(achievements).filter((a: any) => a.tier === tier)
}

export function calculateTotalPoints(achievementIds: string[]): number {
  return achievementIds.reduce((total, id) => {
    const achievement = getAchievementDetails(id)
    return total + (achievement?.points || 0)
  }, 0)
}