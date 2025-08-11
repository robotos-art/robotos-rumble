import { ethers } from 'ethers'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'

// Import ABIs from main project
import RobotoABI from '../../../contract-abi.json'
import RobopetABI from '../../../robopets-abi.json'

const ROBOTO_CONTRACT_ADDRESS = '0x099689220846644F87D1137665CDED7BF3422747'
const ROBOPET_CONTRACT_ADDRESS = '0x4e962D488412A14aA37eAcADCb83f18C7e2271a7'

// Use the same Alchemy setup as main app
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || 'https://eth-mainnet.alchemyapi.io/v2/jwUAqVKEyazD8laQ6Vz224g085Ekr6zz'

const web3 = new Web3(ALCHEMY_KEY)

export function getRobotoContract() {
  return new web3.eth.Contract(RobotoABI as AbiItem[], ROBOTO_CONTRACT_ADDRESS)
}

export function getRobopetContract() {
  return new web3.eth.Contract(RobopetABI as AbiItem[], ROBOPET_CONTRACT_ADDRESS)
}

// Helper to get IPFS gateway URL
export function getIPFSUrl(ipfsUrl: string) {
  // Handle direct IPFS paths
  if (ipfsUrl.startsWith('ipfs://')) {
    const hash = ipfsUrl.replace('ipfs://', '')
    // Use multiple gateways as fallback
    return `https://ipfs.io/ipfs/${hash}`
  }
  
  // Handle Pinata gateway URLs - extract just the path
  if (ipfsUrl.includes('gateway.pinata.cloud')) {
    const parts = ipfsUrl.split('/ipfs/')
    if (parts.length > 1) {
      return `https://ipfs.io/ipfs/${parts[1]}`
    }
  }
  
  return ipfsUrl
}