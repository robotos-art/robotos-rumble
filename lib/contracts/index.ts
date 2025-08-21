import { ethers } from "ethers";
import Web3 from "web3";
import { AbiItem } from "web3-utils";

// Import ABIs
import RobotoABI from "../../contract-abi.json";
import RobopetABI from "../../robopets-abi.json";

const ROBOTO_CONTRACT_ADDRESS = "0x099689220846644F87D1137665CDED7BF3422747";
const ROBOPET_CONTRACT_ADDRESS = "0x4e962D488412A14aA37eAcADCb83f18C7e2271a7";

// Use the same Alchemy setup as main app
const ALCHEMY_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
const ALCHEMY_URL = `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`;

// Lazy initialize Web3 to avoid issues during static generation
let web3Instance: Web3 | null = null;

function getWeb3Instance() {
  if (!web3Instance) {
    // Ensure the Alchemy key is in the correct format (full URL)
    const alchemyUrl = ALCHEMY_KEY.startsWith("http")
      ? ALCHEMY_KEY
      : ALCHEMY_URL;
    web3Instance = new Web3(alchemyUrl);
  }
  return web3Instance;
}

export function getRobotoContract() {
  const web3 = getWeb3Instance();
  return new web3.eth.Contract(RobotoABI as AbiItem[], ROBOTO_CONTRACT_ADDRESS);
}

export function getRobopetContract() {
  const web3 = getWeb3Instance();
  return new web3.eth.Contract(
    RobopetABI as AbiItem[],
    ROBOPET_CONTRACT_ADDRESS,
  );
}

// Helper to get IPFS gateway URL
export function getIPFSUrl(ipfsUrl: string) {
  // Handle direct IPFS paths
  if (ipfsUrl.startsWith("ipfs://")) {
    const hash = ipfsUrl.replace("ipfs://", "");
    // Use multiple gateways as fallback
    return `https://ipfs.io/ipfs/${hash}`;
  }

  // Handle Pinata gateway URLs - extract just the path
  if (ipfsUrl.includes("gateway.pinata.cloud")) {
    const parts = ipfsUrl.split("/ipfs/");
    if (parts.length > 1) {
      return `https://ipfs.io/ipfs/${parts[1]}`;
    }
  }

  return ipfsUrl;
}
