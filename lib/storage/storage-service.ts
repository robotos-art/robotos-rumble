import { get } from '@vercel/edge-config'
import { put, list } from '@vercel/blob'
import type {
  PlayerProfile,
  BattleRecord,
  LeaderboardEntry,
  GlobalStats
} from './types'

export class StorageService {
  private blobToken: string

  constructor() {
    this.blobToken = process.env.BLOB_READ_WRITE_TOKEN || ''
  }

  // === PLAYER PROFILE OPERATIONS ===
  
  async getProfile(address: string): Promise<PlayerProfile | null> {
    try {
      // Use lowercase address for consistency
      const normalizedAddress = address.toLowerCase()
      const blobName = `players/${normalizedAddress}/profile.json`
      
      // Try to fetch from blob storage
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BLOB_URL || 'https://blob-rumble.public.blob.vercel-storage.com'}/${blobName}`
      )
      
      if (!response.ok) {
        if (response.status === 404) {
          return null // Profile doesn't exist yet
        }
        throw new Error(`Failed to fetch profile: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    try {
      const normalizedAddress = profile.walletAddress.toLowerCase()
      const blobName = `players/${normalizedAddress}/profile.json`
      
      await put(blobName, JSON.stringify(profile, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        token: this.blobToken
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      throw error
    }
  }

  // === BATTLE HISTORY OPERATIONS ===
  
  async saveBattle(battle: BattleRecord): Promise<void> {
    try {
      const normalizedAddress = battle.playerAddress.toLowerCase()
      const timestamp = Date.now()
      const blobName = `battles/${normalizedAddress}/${timestamp}.json`
      
      await put(blobName, JSON.stringify(battle, null, 2), {
        access: 'public',
        token: this.blobToken
      })
    } catch (error) {
      console.error('Error saving battle:', error)
      throw error
    }
  }

  async getBattleHistory(address: string, limit = 10): Promise<BattleRecord[]> {
    try {
      const normalizedAddress = address.toLowerCase()
      const prefix = `battles/${normalizedAddress}/`
      
      const { blobs } = await list({
        prefix,
        limit,
        token: this.blobToken
      })
      
      if (!blobs || blobs.length === 0) {
        return []
      }
      
      const battles = await Promise.all(
        blobs.map(async (blob) => {
          try {
            const response = await fetch(blob.url)
            return await response.json()
          } catch (error) {
            console.error('Error fetching battle:', blob.pathname, error)
            return null
          }
        })
      )
      
      // Filter out any failed fetches and sort by timestamp
      return battles
        .filter((battle): battle is BattleRecord => battle !== null)
        .sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
    } catch (error) {
      console.error('Error fetching battle history:', error)
      return []
    }
  }

  // === LEADERBOARD OPERATIONS (Edge Config) ===
  
  async getLeaderboard(type: 'global' | 'weekly' | 'monthly' = 'global'): Promise<LeaderboardEntry[]> {
    try {
      const config = await get('leaderboard')
      if (!config || typeof config !== 'object') {
        return []
      }
      
      const leaderboard = config as any
      return leaderboard[type] || []
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }
  }

  async getElementLeaderboard(element: string): Promise<LeaderboardEntry[]> {
    try {
      const config = await get('leaderboard')
      if (!config || typeof config !== 'object') {
        return []
      }
      
      const leaderboard = config as any
      return leaderboard.elements?.[element] || []
    } catch (error) {
      console.error('Error fetching element leaderboard:', error)
      return []
    }
  }

  async getGlobalStats(): Promise<GlobalStats | null> {
    try {
      const config = await get('globalStats')
      return config as GlobalStats
    } catch (error) {
      console.error('Error fetching global stats:', error)
      return null
    }
  }

  // === HELPER METHODS ===

  async createNewProfile(address: string): Promise<PlayerProfile> {
    const profile: PlayerProfile = {
      walletAddress: address,
      displayName: null,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      stats: {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        favoriteElement: null,
        favoriteRoboto: null,
        averageBattleDuration: 0
      },
      achievements: [],
      badges: []
    }
    
    await this.saveProfile(profile)
    return profile
  }
}