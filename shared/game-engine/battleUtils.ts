import { BATTLE_CONSTANTS } from './battleConstants';

export interface BattleEvent {
  type?: string;
  description?: string;
}

// Determine damage type from battle events and damage
export function determineDamageType(
  damage: number,
  events?: BattleEvent[]
): 'normal' | 'critical' | 'effective' | 'weak' | 'miss' {
  if (damage === 0) {
    return 'miss';
  }

  if (events) {
    // Check for critical hit
    const critEvent = events.find((e) => e.description?.includes('Critical'));
    if (critEvent) {
      return 'critical';
    }

    // Check for element effectiveness
    const effectiveEvent = events.find((e) => e.description?.includes('SUPER EFFECTIVE'));
    if (effectiveEvent) {
      return 'effective';
    }

    const weakEvent = events.find((e) => e.description?.includes('NOT VERY EFFECTIVE'));
    if (weakEvent) {
      return 'weak';
    }
  }

  return 'normal';
}

// Get damage category for sound effects (moved from sound-specific logic)
export function getDamageCategory(
  damage: number,
  isCritical: boolean = false
): 'miss' | 'weak' | 'normal' | 'strong' | 'devastating' | 'critical' {
  if (damage === 0) {
    return 'miss';
  }

  if (isCritical) {
    return 'critical';
  }

  if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.WEAK) {
    return 'weak';
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.NORMAL) {
    return 'normal';
  } else if (damage < BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.STRONG) {
    return 'strong';
  } else {
    return 'devastating';
  }
}