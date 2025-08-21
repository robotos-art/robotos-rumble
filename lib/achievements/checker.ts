import type { BattleRecord, PlayerStats } from "../storage/types";
import achievements from "../data/achievements.json";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  tier?: string;
}

export function checkAchievements(
  battleResult: BattleRecord,
  playerStats: PlayerStats,
  currentAchievements: string[],
): string[] {
  const newAchievements: string[] = [];

  // Helper function to check and add achievement
  const checkAndAdd = (id: string, condition: boolean) => {
    if (!currentAchievements.includes(id) && condition) {
      newAchievements.push(id);
    }
  };

  // First Blood - First victory
  checkAndAdd(
    "first_blood",
    battleResult.result === "victory" && playerStats.wins === 1,
  );

  // === WINNING STREAKS === Award all applicable tiers
  if (playerStats.winStreak >= 3) {
    checkAndAdd("winning_streak_3", true);
  }
  if (playerStats.winStreak >= 5) {
    checkAndAdd("winning_streak_3", true);
    checkAndAdd("winning_streak_5", true);
  }
  if (playerStats.winStreak >= 10) {
    checkAndAdd("winning_streak_3", true);
    checkAndAdd("winning_streak_5", true);
    checkAndAdd("winning_streak_10", true);
  }
  if (playerStats.winStreak >= 20) {
    checkAndAdd("winning_streak_3", true);
    checkAndAdd("winning_streak_5", true);
    checkAndAdd("winning_streak_10", true);
    checkAndAdd("winning_streak_20", true);
  }
  if (playerStats.winStreak >= 50) {
    checkAndAdd("winning_streak_3", true);
    checkAndAdd("winning_streak_5", true);
    checkAndAdd("winning_streak_10", true);
    checkAndAdd("winning_streak_20", true);
    checkAndAdd("winning_streak_50", true);
  }
  if (playerStats.winStreak >= 100) {
    checkAndAdd("winning_streak_3", true);
    checkAndAdd("winning_streak_5", true);
    checkAndAdd("winning_streak_10", true);
    checkAndAdd("winning_streak_20", true);
    checkAndAdd("winning_streak_50", true);
    checkAndAdd("winning_streak_100", true);
  }

  // === TOTAL WINS === Award all applicable tiers
  if (playerStats.wins >= 5) {
    checkAndAdd("total_wins_5", true);
  }
  if (playerStats.wins >= 10) {
    checkAndAdd("total_wins_5", true);
    checkAndAdd("total_wins_10", true);
  }
  if (playerStats.wins >= 25) {
    checkAndAdd("total_wins_5", true);
    checkAndAdd("total_wins_10", true);
    checkAndAdd("total_wins_25", true);
  }
  if (playerStats.wins >= 50) {
    checkAndAdd("total_wins_5", true);
    checkAndAdd("total_wins_10", true);
    checkAndAdd("total_wins_25", true);
    checkAndAdd("total_wins_50", true);
  }
  if (playerStats.wins >= 100) {
    checkAndAdd("total_wins_5", true);
    checkAndAdd("total_wins_10", true);
    checkAndAdd("total_wins_25", true);
    checkAndAdd("total_wins_50", true);
    checkAndAdd("total_wins_100", true);
  }
  if (playerStats.wins >= 250) {
    checkAndAdd("total_wins_5", true);
    checkAndAdd("total_wins_10", true);
    checkAndAdd("total_wins_25", true);
    checkAndAdd("total_wins_50", true);
    checkAndAdd("total_wins_100", true);
    checkAndAdd("total_wins_250", true);
  }
  if (playerStats.wins >= 500) {
    checkAndAdd("total_wins_5", true);
    checkAndAdd("total_wins_10", true);
    checkAndAdd("total_wins_25", true);
    checkAndAdd("total_wins_50", true);
    checkAndAdd("total_wins_100", true);
    checkAndAdd("total_wins_250", true);
    checkAndAdd("total_wins_500", true);
  }

  // === BATTLE VETERAN === Award all applicable tiers
  if (playerStats.totalBattles >= 10) {
    checkAndAdd("battle_veteran_10", true);
  }
  if (playerStats.totalBattles >= 50) {
    checkAndAdd("battle_veteran_10", true);
    checkAndAdd("battle_veteran_50", true);
  }
  if (playerStats.totalBattles >= 100) {
    checkAndAdd("battle_veteran_10", true);
    checkAndAdd("battle_veteran_50", true);
    checkAndAdd("battle_veteran_100", true);
  }
  if (playerStats.totalBattles >= 500) {
    checkAndAdd("battle_veteran_10", true);
    checkAndAdd("battle_veteran_50", true);
    checkAndAdd("battle_veteran_100", true);
    checkAndAdd("battle_veteran_500", true);
  }

  // === DAMAGE ACHIEVEMENTS ===
  // Single battle damage - award all applicable tiers
  if (battleResult.damageDealt >= 500) {
    checkAndAdd("damage_dealer_500", true);
  }
  if (battleResult.damageDealt >= 1000) {
    checkAndAdd("damage_dealer_500", true); // Also award lower tier
    checkAndAdd("damage_dealer_1000", true);
  }
  if (battleResult.damageDealt >= 2000) {
    checkAndAdd("damage_dealer_500", true); // Award all lower tiers
    checkAndAdd("damage_dealer_1000", true);
    checkAndAdd("damage_dealer_2000", true);
  }

  // Total damage dealt - award all applicable tiers
  if (playerStats.totalDamageDealt >= 10000) {
    checkAndAdd("damage_total_10000", true);
  }
  if (playerStats.totalDamageDealt >= 50000) {
    checkAndAdd("damage_total_10000", true); // Also award lower tier
    checkAndAdd("damage_total_50000", true);
  }
  if (playerStats.totalDamageDealt >= 100000) {
    checkAndAdd("damage_total_10000", true); // Award all lower tiers
    checkAndAdd("damage_total_50000", true);
    checkAndAdd("damage_total_100000", true);
  }
  if (playerStats.totalDamageDealt >= 500000) {
    checkAndAdd("damage_total_10000", true); // Award all lower tiers
    checkAndAdd("damage_total_50000", true);
    checkAndAdd("damage_total_100000", true);
    checkAndAdd("damage_total_500000", true);
  }

  // === PERFECT VICTORIES ===
  checkAndAdd(
    "perfect_victory",
    battleResult.result === "victory" && battleResult.damageReceived === 0,
  );

  // Perfect streak (would need to track this separately)
  // For now, check if last 3 battles were perfect
  if (
    battleResult.result === "victory" &&
    battleResult.damageReceived === 0 &&
    playerStats.winStreak >= 3
  ) {
    // Simple heuristic: if on a 3+ win streak with no damage
    checkAndAdd("perfect_streak_3", true);
  }

  // === SPEED ACHIEVEMENTS === Award all applicable tiers
  if (battleResult.result === "victory") {
    if (battleResult.duration < 60) {
      checkAndAdd("speed_demon_60", true);
    }
    if (battleResult.duration < 30) {
      checkAndAdd("speed_demon_60", true);
      checkAndAdd("speed_demon_30", true);
    }
    if (battleResult.duration < 15) {
      checkAndAdd("speed_demon_60", true);
      checkAndAdd("speed_demon_30", true);
      checkAndAdd("speed_demon_15", true);
    }
  }

  // === ELEMENT ACHIEVEMENTS ===
  // Element diversity
  if (battleResult.result === "victory") {
    const uniqueElements = new Set(battleResult.elementsUsed);
    checkAndAdd("element_diversity", uniqueElements.size >= 4);

    // Element mastery (need to track element-specific wins)
    // For now, check if favorite element matches and has enough wins
    if (playerStats.favoriteElement === "SURGE" && playerStats.wins >= 10) {
      checkAndAdd("element_master_surge", true);
    }
    if (playerStats.favoriteElement === "CODE" && playerStats.wins >= 10) {
      checkAndAdd("element_master_code", true);
    }
    if (playerStats.favoriteElement === "METAL" && playerStats.wins >= 10) {
      checkAndAdd("element_master_metal", true);
    }
    if (playerStats.favoriteElement === "GLITCH" && playerStats.wins >= 10) {
      checkAndAdd("element_master_glitch", true);
    }
  }

  // === SPECIAL ACHIEVEMENTS ===
  // Time-based achievements
  const battleTime = new Date(battleResult.timestamp);
  const hour = battleTime.getHours();
  const day = battleTime.getDay();

  checkAndAdd("early_bird", hour < 8 && playerStats.totalBattles === 1);
  checkAndAdd("night_owl", hour >= 0 && hour < 6);
  checkAndAdd(
    "weekend_warrior",
    (day === 0 || day === 6) &&
      battleResult.result === "victory" &&
      playerStats.wins >= 10,
  );

  // Companion Synergy and Paired Victories
  if (battleResult.result === "victory") {
    const robotos = battleResult.teamUsed.filter((u) => u.type === "roboto");
    const robopets = battleResult.teamUsed.filter((u) => u.type === "robopet");

    let companionPairs = 0;
    robotos.forEach((roboto) => {
      const robotoId = roboto.id.replace(/^roboto-/, "");
      if (
        robopets.some((pet) => pet.id.replace(/^robopet-/, "") === robotoId)
      ) {
        companionPairs++;
      }
    });

    // Check for any paired victory
    const hasPairedTeam = companionPairs > 0;
    checkAndAdd("paired_victory", hasPairedTeam);

    // Check for 3+ pairs
    checkAndAdd("companion_synergy", companionPairs >= 3);

    // Check for paired victories milestones - award all applicable tiers
    const pairedVictories = playerStats.pairedVictories || 0;
    if (hasPairedTeam) {
      // Award all applicable tiers
      if (pairedVictories >= 5) {
        checkAndAdd("paired_champion_5", true);
      }
      if (pairedVictories >= 10) {
        checkAndAdd("paired_champion_5", true);
        checkAndAdd("paired_champion_10", true);
      }
      if (pairedVictories >= 25) {
        checkAndAdd("paired_champion_5", true);
        checkAndAdd("paired_champion_10", true);
        checkAndAdd("paired_champion_25", true);
      }
      if (pairedVictories >= 50) {
        checkAndAdd("paired_champion_5", true);
        checkAndAdd("paired_champion_10", true);
        checkAndAdd("paired_champion_25", true);
        checkAndAdd("paired_champion_50", true);
      }

      // Check for perfect paired victory
      checkAndAdd("paired_perfect", battleResult.damageReceived === 0);
    }
  }

  // Tank Master
  checkAndAdd(
    "tank_master",
    battleResult.result === "victory" && battleResult.damageReceived < 100,
  );

  // Note: The following achievements would need additional battle tracking:
  // - comeback_kid (need to track units remaining)
  // - survivor (need to track remaining HP)
  // - critical_striker (need to track critical hits)
  // - status_master (need to track status effects)
  // - dodge_master (need to track dodges)
  // These can be implemented when we add more detailed battle tracking

  return newAchievements;
}

export function getAchievementDetails(
  achievementId: string,
): Achievement | null {
  return (achievements as any)[achievementId] || null;
}

export function getAllAchievements(): Achievement[] {
  return Object.values(achievements);
}

export function getAchievementsByTier(tier: string): Achievement[] {
  return Object.values(achievements).filter((a: any) => a.tier === tier);
}

export function calculateTotalPoints(achievementIds: string[]): number {
  return achievementIds.reduce((total, id) => {
    const achievement = getAchievementDetails(id);
    return total + (achievement?.points || 0);
  }, 0);
}
