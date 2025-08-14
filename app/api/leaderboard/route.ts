import { NextRequest, NextResponse } from 'next/server'
import { StorageService } from '@/lib/storage/storage-service'

const storage = new StorageService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'global' | 'weekly' | 'monthly' || 'global'
    const element = searchParams.get('element')
    
    // Get element-specific leaderboard if requested
    if (element) {
      const elementLeaderboard = await storage.getElementLeaderboard(element)
      return NextResponse.json(elementLeaderboard)
    }
    
    // Get regular leaderboard
    const leaderboard = await storage.getLeaderboard(type)
    
    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}