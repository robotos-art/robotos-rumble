import { gameSounds } from "../sounds/gameSounds";
import { BATTLE_CONSTANTS } from "./battleConstants";

export interface BattleEvent {
  type?: string;
  description?: string;
}

// Play damage sound based on damage amount and type
export function playDamageSound(
  damage: number,
  isCritical: boolean = false,
  timingScore: number = 1.0
): void {
  // Handle miss
  if (damage === 0) {
    gameSounds.play("miss");
    return;
  }
  
  // Handle critical hits with special sounds
  if (isCritical) {
    if (damage >= BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.STRONG) {
      gameSounds.play("criticalSuper");
    } else if (timingScore >= BATTLE_CONSTANTS.TIMING_BONUS.PERFECT) {
      gameSounds.play("criticalCombo"); // Perfect timing + critical
    } else {
      gameSounds.play("critical");
    }
    return;
  }
  
  // Regular damage sounds
  if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.WEAK) {
    gameSounds.play("attackWeak");
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.NORMAL) {
    gameSounds.play("attackNormal");
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.STRONG) {
    gameSounds.play("attackStrong");
  } else {
    gameSounds.play("attackDevastating");
  }
}

// Determine damage type from battle events and damage
export function determineDamageType(
  damage: number,
  events?: BattleEvent[]
): "normal" | "critical" | "effective" | "weak" | "miss" {
  if (damage === 0) {
    return "miss";
  }
  
  if (events) {
    // Check for critical hit
    const critEvent = events.find((e) =>
      e.description?.includes("Critical")
    );
    if (critEvent) {
      return "critical";
    }
    
    // Check for element effectiveness
    const effectiveEvent = events.find((e) =>
      e.description?.includes("SUPER EFFECTIVE")
    );
    if (effectiveEvent) {
      return "effective";
    }
    
    const weakEvent = events.find((e) =>
      e.description?.includes("NOT VERY EFFECTIVE")
    );
    if (weakEvent) {
      return "weak";
    }
  }
  
  return "normal";
}