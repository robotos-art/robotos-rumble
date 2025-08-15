import { NextRequest, NextResponse } from 'next/server'
import { StorageService } from '@/lib/storage/storage-service'
import { normalizeAddress } from '@/lib/utils/address'
import { getRobotoContract, getRobopetContract } from '@/lib/contracts'

export const dynamic = 'force-dynamic'

const storage = new StorageService()

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    const normalizedAddress = normalizeAddress(address)
    
    // Get profile from Blob storage
    let profile = await storage.getProfile(normalizedAddress)
    
    // Create new profile if doesn't exist
    if (!profile) {
      profile = await storage.createNewProfile(normalizedAddress)
      
      // Auto-select first NFT as avatar
      try {
        const robotoContract = getRobotoContract()
        const robopetContract = getRobopetContract()
        
        // Check Robotos first
        const robotoBalance = await robotoContract.methods.balanceOf(normalizedAddress).call()
        if (Number(robotoBalance) > 0) {
          const tokenId = await robotoContract.methods.tokenOfOwnerByIndex(normalizedAddress, 0).call()
          profile.avatar = {
            type: 'roboto',
            tokenId: String(tokenId)
          }
          await storage.saveProfile(profile)
        } else {
          // Check Robopets
          const robopetBalance = await robopetContract.methods.balanceOf(normalizedAddress).call()
          if (Number(robopetBalance) > 0) {
            const tokenId = await robopetContract.methods.tokenOfOwnerByIndex(normalizedAddress, 0).call()
            // Get metadata for image URL
            try {
              const tokenURI = await robopetContract.methods.tokenURI(tokenId).call()
              const metadataUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
              const metadataResponse = await fetch(metadataUrl)
              const metadata = await metadataResponse.json()
              profile.avatar = {
                type: 'robopet',
                tokenId: String(tokenId),
                imageUrl: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || ''
              }
            } catch {
              profile.avatar = {
                type: 'robopet',
                tokenId: String(tokenId)
              }
            }
            await storage.saveProfile(profile)
          }
        }
      } catch (error) {
        console.error('Error auto-selecting avatar:', error)
      }
    }
    
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    const normalizedAddress = normalizeAddress(address)
    const updates = await request.json()
    
    const profile = await storage.getProfile(normalizedAddress)
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    // Allow updating display name
    if (updates.displayName !== undefined) {
      // Validate display name
      const displayName = updates.displayName?.trim() || null
      if (displayName && displayName.length > 20) {
        return NextResponse.json(
          { error: 'Display name must be 20 characters or less' },
          { status: 400 }
        )
      }
      profile.displayName = displayName
    }
    
    // Update last seen
    profile.lastSeenAt = new Date().toISOString()
    
    await storage.saveProfile(profile)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}