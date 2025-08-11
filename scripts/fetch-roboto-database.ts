#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'

const IPFS_HASH = 'QmQh36CsceXZoqS7v9YQLUyxXdRmWd8YTBUz7WCXsiVty'
const CDN_URL = 'https://d2lp2vbc3umjmr.cloudfront.net'
const OUTPUT_PATH = path.join(process.cwd(), 'lib/data/roboto-database.json')
const BATCH_SIZE = 10
const TOTAL_ROBOTOS = 100 // Fetch first 100 for a good sample

interface RobotoMetadata {
  tokenId: string
  name: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string
  }>
}

async function fetchMetadata(tokenId: number): Promise<RobotoMetadata | null> {
  try {
    const response = await fetch(`https://ipfs.io/ipfs/${IPFS_HASH}/${tokenId}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const metadata = await response.json()
    
    return {
      tokenId: tokenId.toString(),
      name: metadata.name || `Roboto #${tokenId}`,
      image: `${CDN_URL}/${tokenId}/roboto-transparent.png`,
      attributes: metadata.attributes || []
    }
  } catch (error) {
    console.error(`Failed to fetch metadata for Roboto #${tokenId}:`, error)
    // Return minimal metadata as fallback
    return {
      tokenId: tokenId.toString(),
      name: `Roboto #${tokenId}`,
      image: `${CDN_URL}/${tokenId}/roboto-transparent.png`,
      attributes: []
    }
  }
}

async function fetchBatch(startId: number, endId: number): Promise<RobotoMetadata[]> {
  const promises = []
  for (let i = startId; i <= endId; i++) {
    promises.push(fetchMetadata(i))
  }
  
  const results = await Promise.all(promises)
  return results.filter((r): r is RobotoMetadata => r !== null)
}

async function main() {
  console.log('🤖 Starting Roboto metadata fetch...')
  console.log(`📊 Fetching metadata for ${TOTAL_ROBOTOS} Robotos`)
  
  const allMetadata: RobotoMetadata[] = []
  
  // Fetch in batches to avoid overwhelming the IPFS gateway
  for (let i = 1; i <= TOTAL_ROBOTOS; i += BATCH_SIZE) {
    const endId = Math.min(i + BATCH_SIZE - 1, TOTAL_ROBOTOS)
    console.log(`📥 Fetching batch ${i}-${endId}...`)
    
    const batch = await fetchBatch(i, endId)
    allMetadata.push(...batch)
    
    // Small delay between batches to be nice to the IPFS gateway
    if (i + BATCH_SIZE <= TOTAL_ROBOTOS) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log(`✅ Successfully fetched ${allMetadata.length} Robotos`)
  
  // Ensure the data directory exists
  const dataDir = path.dirname(OUTPUT_PATH)
  await fs.mkdir(dataDir, { recursive: true })
  
  // Save to file
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(allMetadata, null, 2),
    'utf-8'
  )
  
  console.log(`💾 Saved to ${OUTPUT_PATH}`)
  console.log('🎉 Done!')
}

// Run the script
main().catch(console.error)