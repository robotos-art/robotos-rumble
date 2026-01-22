/**
 * Centralized URL configuration for the application
 * All external URLs and API endpoints should be defined here
 */

// CDN URLs for NFT images
export const CDN_URLS = {
  ROBOTOS: 'https://d2lp2vbc3umjmr.cloudfront.net',
  ROBOPETS: 'https://d2w8sp0plvpr8a.cloudfront.net',
} as const;

// IPFS Gateway URLs
export const IPFS_GATEWAYS = {
  DEFAULT: 'https://ipfs.io/ipfs',
  ROBOTOS_METADATA: 'QmQh36CsceXZoqS7v9YQLUyxXdRmWd8YWTBUz7WCXsiVty',
  ROBOPETS_METADATA: 'QmcVBQAbPMzEstPyaBoZ3J1dnE3t1horoX9WebLcCCYLR9',
} as const;

// Marketplace URLs
export const MARKETPLACE_URLS = {
  ROBOTOS_OPENSEA: 'https://opensea.io/collection/robotos-official',
  ROBOPETS_OPENSEA: 'https://opensea.io/collection/robopets',
} as const;

// WebSocket URLs for multiplayer
export const WEBSOCKET_URLS = {
  COLYSEUS: process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567',
} as const;

// Helper functions for generating URLs
export const getImageUrl = {
  roboto: (tokenId: string | number) => 
    `${CDN_URLS.ROBOTOS}/${tokenId}/roboto-transparent.png`,
  
  robopet: (tokenId: string | number) => 
    `${CDN_URLS.ROBOPETS}/${tokenId}/body-transparent.png`,
  
  ipfsMetadata: (hash: string, tokenId: string | number) => 
    `${IPFS_GATEWAYS.DEFAULT}/${hash}/${tokenId}`,
} as const;

// Contract addresses (moved from scattered locations)
export const CONTRACT_ADDRESSES = {
  ROBOTOS: '0x099689220846644F87D1137665CDED7BF3422747',
  ROBOPETS: '0x4e962D488412A14aA37eAcADCb83f18C7e2271a7',
} as const;

// Test wallets
export const TEST_WALLETS = {
  PABLO_TEST: '0x63989a803b61581683B54AB6188ffa0F4bAAdf28',
} as const;