import { put, list, del, head } from '@vercel/blob'
import { getEnsNameForAddress } from '../utils/ens'
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
      const prefix = `players/${normalizedAddress}/profile.json`
      
      // List blobs with the specific prefix
      const { blobs } = await list({
        prefix,
        limit: 1,
        token: this.blobToken
      })
      
      if (!blobs || blobs.length === 0) {
        return null // Profile doesn't exist yet
      }
      
      // Fetch the profile from the blob URL
      const response = await fetch(blobs[0].url)
      if (!response.ok) {
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
      
      // CRITICAL FIX: Do NOT delete the existing profile!
      // Vercel Blob handles overwrites automatically
      // Deleting first causes race conditions and data loss
      
      // Validate against stat decreases to prevent data loss
      const existing = await this.getProfile(profile.walletAddress)
      if (existing && existing.stats.wins > profile.stats.wins) {
        console.error('WARNING: Rejected profile update - wins decreased!', {
          address: profile.walletAddress,
          oldWins: existing.stats.wins,
          newWins: profile.stats.wins,
          oldTotal: existing.stats.totalBattles,
          newTotal: profile.stats.totalBattles,
          timestamp: new Date().toISOString()
        })
        throw new Error(`Cannot decrease win count from ${existing.stats.wins} to ${profile.stats.wins}`)
      }
      
      // Save backup before updating (keep last 5 backups)
      try {
        if (existing && existing.stats.totalBattles > 0) {
          const backupName = `players/${normalizedAddress}/backups/${Date.now()}.json`
          await put(backupName, JSON.stringify(existing, null, 2), {
            access: 'public',
            allowOverwrite: true,  // Allow overwriting backups
            contentType: 'application/json',
            token: this.blobToken
          })
          
          // Clean up old backups (keep only last 5)
          const { blobs } = await list({
            prefix: `players/${normalizedAddress}/backups/`,
            token: this.blobToken
          })
          
          if (blobs && blobs.length > 5) {
            // Sort by name (timestamp) and delete oldest
            const sortedBlobs = blobs.sort((a, b) => a.pathname.localeCompare(b.pathname))
            const toDelete = sortedBlobs.slice(0, blobs.length - 5)
            for (const blob of toDelete) {
              try {
                await del(blob.url, { token: this.blobToken })
              } catch (e) {
                console.error('Error deleting old backup:', e)
              }
            }
          }
        }
      } catch (e) {
        console.error('Error creating backup:', e)
        // Continue with save even if backup fails
      }
      
      // Add timestamp for version control
      profile.lastUpdated = new Date().toISOString()
      
      // Save profile - Vercel Blob will overwrite if it exists
      await put(blobName, JSON.stringify(profile, null, 2), {
        access: 'public',
        addRandomSuffix: false, // Important: keep the same filename
        allowOverwrite: true,   // Required to update existing profiles
        contentType: 'application/json',
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

  // === LEADERBOARD OPERATIONS ===
  
  async getLeaderboard(type: 'global' | 'weekly' | 'monthly' = 'global'): Promise<LeaderboardEntry[]> {
    try {
      // For now, fetch all player profiles and sort them
      // In production, this would be cached or use a proper database
      const { blobs } = await list({
        prefix: 'players/',
        limit: 100,
        token: this.blobToken
      })
      
      if (!blobs || blobs.length === 0) {
        return []
      }
      
      const profiles = await Promise.all(
        blobs
          .filter(blob => blob.pathname.endsWith('/profile.json'))
          .map(async (blob) => {
            try {
              const response = await fetch(blob.url)
              return await response.json() as PlayerProfile
            } catch (e) {
              console.error('Error fetching profile from blob:', e)
              return null
            }
          })
      )
      
      // Filter out nulls and sort by wins
      const validProfiles = profiles.filter(p => p !== null) as PlayerProfile[]
      
      const sorted = validProfiles
        .filter(p => p.stats.totalBattles > 0)
        .sort((a, b) => {
          // Sort by wins, then by win rate
          if (b.stats.wins !== a.stats.wins) {
            return b.stats.wins - a.stats.wins
          }
          const bWinRate = b.stats.wins / b.stats.totalBattles
          const aWinRate = a.stats.wins / a.stats.totalBattles
          return bWinRate - aWinRate
        })
        .slice(0, 20) // Top 20
        .map((profile, index) => ({
          rank: index + 1,
          address: profile.walletAddress,  // Changed from walletAddress to address
          displayName: profile.displayName,
          ensName: profile.ensName,
          avatar: profile.avatar,
          wins: profile.stats.wins,
          losses: profile.stats.losses,
          winRate: profile.stats.totalBattles > 0 
            ? Math.round((profile.stats.wins / profile.stats.totalBattles) * 100)
            : 0,
          winStreak: profile.stats.winStreak,
          favoriteElement: profile.stats.favoriteElement,
          lastUpdated: profile.lastSeenAt
        }))
      
      return sorted
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }
  }

  async getElementLeaderboard(element: string): Promise<LeaderboardEntry[]> {
    // Not implemented - could filter leaderboard by element
    return []
  }

  async getGlobalStats(): Promise<GlobalStats | null> {
    // Could calculate from all profiles if needed
    return null
  }

  // === HELPER METHODS ===

  async createNewProfile(address: string): Promise<PlayerProfile> {
    // Fetch ENS name for the address
    const ensName = await getEnsNameForAddress(address)
    
    const profile: PlayerProfile = {
      walletAddress: address,
      displayName: null,
      ensName: ensName,
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
        averageBattleDuration: 0,
        pairedVictories: 0
      },
      achievements: [],
      badges: []
    }
    
    await this.saveProfile(profile)
    return profile
  }
}