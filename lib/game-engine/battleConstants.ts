// Battle system constants
export const BATTLE_CONSTANTS = {
  // Damage thresholds for sound effects
  DAMAGE_THRESHOLDS: {
    MISS: 0,
    WEAK: 30,
    NORMAL: 60,
    STRONG: 100,
  },
  
  // Timer durations in milliseconds
  TIMERS: {
    BATTLE_START_DELAY: 2000,
    MESSAGE_DURATION: 2000,
    TURN_START_DELAY: 2000,
    ACTION_INTERVAL: 1500,
    DAMAGE_NUMBER_DURATION: 1500,
  },
  
  // Battle speeds (turn timer in seconds)
  SPEED_SETTINGS: {
    SPEEDY: 5,
    NORMAL: 10,
    RELAXED: 15,
  },
  
  // Team sizes
  TEAM_SIZES: {
    SMALL: 3,
    MEDIUM: 5,
    LARGE: 7,
  },
  
  // Defense bonus thresholds
  DEFENSE_BONUS: {
    PERFECT: { threshold: 1.5, multiplier: 0.5 },
    GOOD: { threshold: 1.25, multiplier: 0.75 },
    NORMAL: { threshold: 1.0, multiplier: 1.0 },
    WEAK: { threshold: 0, multiplier: 1.2 },
  },
  
  // Timing bonus thresholds
  TIMING_BONUS: {
    PERFECT: 2.0,
    GOOD: 1.5,
    NORMAL: 1.0,
    WEAK: 0.5,
  },
} as const;

// Damage type determination
export type DamageType = "miss" | "critical" | "normal" | "effective" | "weak";

export function getDamageType(
  damage: number,
  isCritical: boolean = false,
  isEffective: boolean = false,
  isWeak: boolean = false
): DamageType {
  if (damage === 0) return "miss";
  if (isCritical) return "critical";
  if (isEffective) return "effective";
  if (isWeak) return "weak";
  return "normal";
}

// Sound playing based on damage amount
export function getDamageSoundType(damage: number): string {
  if (damage === BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.MISS) {
    return "miss";
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.WEAK) {
    return "attackWeak";
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.NORMAL) {
    return "attackNormal";
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.STRONG) {
    return "attackStrong";
  } else {
    return "attackDevastating";
  }
}