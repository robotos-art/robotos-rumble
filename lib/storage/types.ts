export interface PlayerProfile {
  walletAddress: string
  displayName?: string | null
  ensName?: string | null
  avatar?: {
    type: 'roboto' | 'robopet'
    tokenId: string
    imageUrl?: string
  } | null
  createdAt: string
  lastSeenAt: string
  stats: PlayerStats
  achievements: string[]
  badges: Badge[]
}

export interface PlayerStats {
  totalBattles: number
  wins: number
  losses: number
  winStreak: number
  bestWinStreak: number
  totalDamageDealt: number
  totalDamageReceived: number
  favoriteElement: string | null
  favoriteRoboto: string | null
  averageBattleDuration: number
}

export interface BattleRecord {
  id: string
  playerAddress: string
  timestamp: string
  result: 'victory' | 'defeat'
  duration: number
  teamUsed: {
    id: string
    name: string
    element: string
    type: 'roboto' | 'robopet'
  }[]
  enemyTeam: {
    id: string
    name: string
    element: string
    type: 'roboto' | 'robopet'
  }[]
  damageDealt: number
  damageReceived: number
  elementsUsed: string[]
}

export interface Badge {
  id: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  earnedAt: string
}

export interface LeaderboardEntry {
  address: string
  displayName?: string | null
  ensName?: string | null
  avatar?: {
    type: 'roboto' | 'robopet'
    tokenId: string
    imageUrl?: string
  } | null
  wins: number
  losses: number
  winRate: number
  winStreak: number
  favoriteElement: string | null
  lastUpdated: string
}

export interface GlobalStats {
  totalBattles: number
  totalPlayers: number
  mostUsedElement: string
  averageBattleDuration: number
}