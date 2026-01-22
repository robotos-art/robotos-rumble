/**
 * Game-wide constants for Robotos Rumble
 * Centralizes all magic numbers and configuration values
 */

// Team Configuration
export const TEAM_SIZES = {
  SMALL: 3,
  STANDARD: 5,
} as const;

export const BATTLE_SPEED = {
  CALM: {
    NAME: 'calm',
    TIMER_DURATION: 10,
    DESCRIPTION: '10 second decisions',
  },
  SPEEDY: {
    NAME: 'speedy',
    TIMER_DURATION: 5,
    DESCRIPTION: '5 second decisions',
  },
} as const;

// Battle Timers (in milliseconds)
export const BATTLE_TIMERS = {
  MESSAGE_DURATION: 3000,
  BATTLE_START_DELAY: 2000,
  ACTION_INTERVAL: 500,
  TURN_DELAY: 1500,
  ATTACK_ANIMATION_DELAY: 1000,
  PROJECTILE_TRAVEL_TIME: 800,
  EXPLOSION_DURATION: 500,
  DAMAGE_NUMBER_DURATION: 2000,
  VICTORY_SCREEN_DELAY: 3000,
} as const;

// Timing Minigame
export const TIMING_GAME = {
  ATTACK_COUNTDOWN: 5,
  PERFECT_MULTIPLIER: 2.0,
  GOOD_MULTIPLIER: 1.5,
  NORMAL_MULTIPLIER: 1.0,
  WEAK_MULTIPLIER: 0.8,
  MISS_MULTIPLIER: 0.5,
} as const;

// AI Configuration
export const AI_CONFIG = {
  ABILITY_USE_CHANCE: 0.35,
  INTELLIGENCE_SMART_THRESHOLD: 0.7,
  INTELLIGENCE_MEDIUM_THRESHOLD: 0.4,
  LOW_HEALTH_THRESHOLD: 30, // percentage
  PERFECT_HIT_CHANCE: 0.05,
  MIN_DELAY: 1200,
  MAX_DELAY: 2500,
} as const;

// Energy System
export const ENERGY_CONFIG = {
  REGEN_PER_TURN: 20,
  MAX_ENERGY: 100,
  MIN_ENERGY: 0,
} as const;

// Damage Calculations
export const DAMAGE_CONFIG = {
  DEFENSE_REDUCTION_FACTOR: 0.5,
  CRITICAL_DAMAGE_MULTIPLIER: 2.0,
  MIN_DAMAGE: 1,
  BASE_DAMAGE_MULTIPLIER: 2,
} as const;

// Element System
export const ELEMENT_ADVANTAGE = {
  STRONG_MULTIPLIER: 1.5,
  WEAK_MULTIPLIER: 0.75,
  NEUTRAL_MULTIPLIER: 1.0,
} as const;

// Status Effects
export const STATUS_DURATIONS = {
  BURN: 3,
  FREEZE: 2,
  POISON: 4,
  PARALYZE: 2,
  SHIELD: 3,
  REGEN: 3,
  DEFAULT: 3,
} as const;

export const STATUS_DAMAGE = {
  BURN_PER_TURN: 10,
  POISON_PER_TURN: 15,
  REGEN_PER_TURN: 20,
} as const;

// Animation Constants
export const ANIMATIONS = {
  UNIT_SCALE_ACTIVE: 1.1,
  UNIT_SCALE_NORMAL: 1.0,
  UNIT_MOVE_DISTANCE: 20,
  UNIT_MOVE_DISTANCE_MOBILE: 10,
  FADE_IN_DELAY: 0.1,
  SHAKE_DURATION: 500,
} as const;

// UI Constants
export const UI_CONFIG = {
  MOBILE_BREAKPOINT: 640,
  MESSAGE_Z_INDEX: 100,
  DAMAGE_NUMBER_Z_INDEX: 100,
  ACTIVE_UNIT_Z_INDEX: 3,
  DEFENDING_UNIT_Z_INDEX: 5,
  DEFAULT_Z_INDEX: 1,
} as const;

// Network/PvP Constants
export const PVP_CONFIG = {
  MESSAGE_DEDUPE_TIME: 500, // ms
  MESSAGE_CLEANUP_TIME: 2000, // ms
  MIN_COUNTDOWN_TIME: 3, // seconds
  ROOM_CLEANUP_DELAY: 5000, // ms
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  BATTLE_SETTINGS: 'battle_settings',
  TEAM_PREFIX: 'roboto_rumble_team_',
  BATTLE_MODE: 'battle_mode',
  PVP_NOTIFICATIONS: 'pvp_notifications_asked',
} as const;

// API Endpoints (relative)
export const API_ROUTES = {
  SAVE_BATTLE: '/api/battles/save',
  LOAD_BATTLE: '/api/battles/load',
  BATTLE_HISTORY: '/api/battles/history',
  LEADERBOARD: '/api/leaderboard',
  PLAYER_PROFILE: '/api/player',
  PLAYER_AVATAR: '/api/player/avatar',
} as const;

// Default Values
export const DEFAULTS = {
  TEAM_SIZE: TEAM_SIZES.STANDARD,
  BATTLE_SPEED: BATTLE_SPEED.SPEEDY.NAME,
  STARTING_HP: 100,
  STARTING_ENERGY: 50,
  BASE_CRIT_CHANCE: 10,
} as const;