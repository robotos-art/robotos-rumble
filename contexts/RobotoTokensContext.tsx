'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { getRobotoContract, getRobopetContract } from '../lib/contracts'
import { TokenWithMetadata } from '../lib/hooks/useRobotoTokens'

interface RobotoTokensContextType {
  robotos: TokenWithMetadata[]
  robopets: TokenWithMetadata[]
  allTokens: TokenWithMetadata[]
  loading: boolean
  error: string | null
  loadingProgress: number
  refetch: () => void
}

const RobotoTokensContext = createContext<RobotoTokensContextType | null>(null)

// Cache helpers
const CACHE_KEY = 'roboto_rumble_tokens_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function getCachedTokens(address: string): { robotos: TokenWithMetadata[], robopets: TokenWithMetadata[], timestamp: number } | null {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${address}`)
    if (!cached) return null
    
    const data = JSON.parse(cached)
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_KEY}_${address}`)
      return null
    }
    
    return data
  } catch {
    return null
  }
}

function setCachedTokens(address: string, robotos: TokenWithMetadata[], robopets: TokenWithMetadata[]) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${address}`, JSON.stringify({
      robotos,
      robopets,
      timestamp: Date.now()
    }))
  } catch (e) {
    // Failed to cache tokens - continue without caching
  }
}

export function RobotoTokensProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [robotos, setRobotos] = useState<TokenWithMetadata[]>([])
  const [robopets, setRobopets] = useState<TokenWithMetadata[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const fetchTokensConcurrently = useCallback(async () => {
    if (!address) return
    
    // Check cache first
    const cached = getCachedTokens(address)
    if (cached) {
      setRobotos(cached.robotos)
      setRobopets(cached.robopets)
      return
    }
    
    setLoading(true)
    setError(null)
    setLoadingProgress(0)
    
    try {
      // Fetch balances first
      const robotoContract = getRobotoContract()
      const robopetContract = getRobopetContract()
      
      const [robotoBalance, robopetBalance] = await Promise.all([
        robotoContract.methods.balanceOf(address).call(),
        robopetContract.methods.balanceOf(address).call()
      ])
      
      const totalTokens = Number(robotoBalance) + Number(robopetBalance)
      let processedTokens = 0
      
      // Fetch all token IDs first
      const robotoIdPromises = []
      const robopetIdPromises = []
      
      for (let i = 0; i < robotoBalance; i++) {
        robotoIdPromises.push(robotoContract.methods.tokenOfOwnerByIndex(address, i).call())
      }
      
      for (let i = 0; i < robopetBalance; i++) {
        robopetIdPromises.push(robopetContract.methods.tokenOfOwnerByIndex(address, i).call())
      }
      
      const [robotoIds, robopetIds] = await Promise.all([
        Promise.all(robotoIdPromises),
        Promise.all(robopetIdPromises)
      ])
      
      
      // Check for duplicates
      const uniqueRobotoIds = Array.from(new Set(robotoIds.map(id => id.toString())))
      const uniqueRobopetIds = Array.from(new Set(robopetIds.map(id => id.toString())))
      
      
      // Fetch metadata concurrently with progress updates
      const fetchMetadataBatch = async (tokenIds: string[], type: 'roboto' | 'robopet') => {
        const ipfsHash = type === 'roboto' 
          ? 'QmQh36CsceXZoqS7v9YQLUyxXdRmWd8YWTBUz7WCXsiVty'
          : 'QmcVBQAbPMzEstPyaBoZ3J1dnE3t1horoX9WebLcCCYLR9'
        
        const cdnUrl = type === 'roboto'
          ? 'https://d2lp2vbc3umjmr.cloudfront.net'
          : 'https://d2w8sp0plvpr8a.cloudfront.net'
          
        const imageName = type === 'roboto' ? 'roboto-transparent.png' : 'body-transparent.png'
        
        const promises = tokenIds.map(async (tokenId) => {
          try {
            // Try IPFS gateway with timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
            
            const response = await fetch(
              `https://ipfs.io/ipfs/${ipfsHash}/${tokenId}`,
              { signal: controller.signal }
            )
            clearTimeout(timeoutId)
            
            const metadata = await response.json()
            
            processedTokens++
            setLoadingProgress(Math.round((processedTokens / totalTokens) * 100))
            
            return {
              tokenId: tokenId.toString(),
              metadata: {
                ...metadata,
                tokenId: tokenId.toString(),
                image: `${cdnUrl}/${tokenId}/${imageName}`
              },
              type
            } as TokenWithMetadata
          } catch (err) {
            // Failed to load metadata, using fallback
            processedTokens++
            setLoadingProgress(Math.round((processedTokens / totalTokens) * 100))
            
            // Return with minimal metadata
            return {
              tokenId: tokenId.toString(),
              metadata: {
                name: `${type === 'roboto' ? 'Roboto' : 'Robopet'} #${tokenId}`,
                tokenId: tokenId.toString(),
                image: `${cdnUrl}/${tokenId}/${imageName}`,
                attributes: []
              },
              type
            } as TokenWithMetadata
          }
        })
        
        return Promise.all(promises)
      }
      
      // Batch fetch in chunks to avoid overwhelming the browser
      const BATCH_SIZE = 10
      const robotoTokens: TokenWithMetadata[] = []
      const robopetTokens: TokenWithMetadata[] = []
      
      // Process Robotos in batches
      for (let i = 0; i < robotoIds.length; i += BATCH_SIZE) {
        const batch = robotoIds.slice(i, i + BATCH_SIZE)
        const results = await fetchMetadataBatch(batch, 'roboto')
        robotoTokens.push(...results)
        // Create new array to avoid React state update issues
        setRobotos(prev => {
          const newTokens = [...robotoTokens]
          // Remove duplicates by tokenId
          const uniqueTokens = newTokens.filter((token, index, self) =>
            index === self.findIndex(t => t.tokenId === token.tokenId)
          )
          return uniqueTokens
        })
      }
      
      // Process Robopets in batches
      for (let i = 0; i < robopetIds.length; i += BATCH_SIZE) {
        const batch = robopetIds.slice(i, i + BATCH_SIZE)
        const results = await fetchMetadataBatch(batch, 'robopet')
        robopetTokens.push(...results)
        // Create new array to avoid React state update issues
        setRobopets(prev => {
          const newTokens = [...robopetTokens]
          // Remove duplicates by tokenId
          const uniqueTokens = newTokens.filter((token, index, self) =>
            index === self.findIndex(t => t.tokenId === token.tokenId)
          )
          return uniqueTokens
        })
      }
      
      // Cache the results
      setCachedTokens(address, robotoTokens, robopetTokens)
      
    } catch (err) {
      console.error('Error fetching tokens:', err)
      setError('Failed to load your Robotos and Robopets')
    } finally {
      setLoading(false)
      setLoadingProgress(100)
    }
  }, [address])
  
  useEffect(() => {
    if (!address) {
      setRobotos([])
      setRobopets([])
      return
    }
    
    fetchTokensConcurrently()
  }, [address, fetchTokensConcurrently])
  
  const value: RobotoTokensContextType = {
    robotos,
    robopets,
    allTokens: [...robotos, ...robopets],
    loading,
    error,
    loadingProgress,
    refetch: fetchTokensConcurrently
  }
  
  return (
    <RobotoTokensContext.Provider value={value}>
      {children}
    </RobotoTokensContext.Provider>
  )
}

export function useRobotoTokensContext() {
  const context = useContext(RobotoTokensContext)
  if (!context) {
    throw new Error('useRobotoTokensContext must be used within RobotoTokensProvider')
  }
  return context
}