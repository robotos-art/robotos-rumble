"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineDamageType = determineDamageType;
exports.getDamageCategory = getDamageCategory;
const battleConstants_1 = require("./battleConstants");
// Determine damage type from battle events and damage
function determineDamageType(damage, events) {
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
function getDamageCategory(damage, isCritical = false) {
    if (damage === 0) {
        return 'miss';
    }
    if (isCritical) {
        return 'critical';
    }
    if (damage < battleConstants_1.BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.WEAK) {
        return 'weak';
    }
    else if (damage < battleConstants_1.BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.NORMAL) {
        return 'normal';
    }
    else if (damage < battleConstants_1.BATTLE_CONSTANTS.DAMAGE_THRESHOLDS.STRONG) {
        return 'strong';
    }
    else {
        return 'devastating';
    }
}
