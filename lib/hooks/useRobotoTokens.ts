import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  getRobotoContract,
  getRobopetContract,
  getIPFSUrl,
} from "../contracts";

export interface TokenWithMetadata {
  tokenId: string;
  metadata: any;
  type: "roboto" | "robopet";
}

export function useRobotoTokens() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [robotos, setRobotos] = useState<TokenWithMetadata[]>([]);
  const [robopets, setRobopets] = useState<TokenWithMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch Robotos
      const robotoContract = getRobotoContract();
      const robotoBalance = await robotoContract.methods
        .balanceOf(address)
        .call();
      const robotoTokens: TokenWithMetadata[] = [];

      for (let i = 0; i < robotoBalance; i++) {
        try {
          const tokenId = await robotoContract.methods
            .tokenOfOwnerByIndex(address, i)
            .call();

          // Fetch metadata from IPFS using the known IPFS hash
          const metadataResponse = await fetch(
            `https://ipfs.io/ipfs/QmQh36CsceXZoqS7v9YQLUyxXdRmWd8YWTBUz7WCXsiVty/${tokenId}`,
          );
          const ipfsMetadata = await metadataResponse.json();

          // Use CloudFront CDN for image
          const metadata = {
            ...ipfsMetadata,
            tokenId: tokenId.toString(),
            image: `https://d2lp2vbc3umjmr.cloudfront.net/${tokenId}/roboto-transparent.png`,
          };

          robotoTokens.push({
            tokenId: tokenId.toString(),
            metadata,
            type: "roboto",
          });
        } catch (err) {
          // Add placeholder if metadata fetch fails
          const tokenId = await robotoContract.methods
            .tokenOfOwnerByIndex(address, i)
            .call();
          robotoTokens.push({
            tokenId: tokenId.toString(),
            metadata: {
              name: `Roboto #${tokenId}`,
              tokenId: tokenId.toString(),
              image: `https://d2lp2vbc3umjmr.cloudfront.net/${tokenId}/roboto-transparent.png`,
              attributes: [],
            },
            type: "roboto",
          });
        }
      }

      setRobotos(robotoTokens);

      // Fetch Robopets
      const robopetContract = getRobopetContract();
      const robopetBalance = await robopetContract.methods
        .balanceOf(address)
        .call();
      const robopetTokens: TokenWithMetadata[] = [];

      for (let i = 0; i < robopetBalance; i++) {
        try {
          const tokenId = await robopetContract.methods
            .tokenOfOwnerByIndex(address, i)
            .call();

          // Fetch metadata from IPFS using the known IPFS hash
          const metadataResponse = await fetch(
            `https://ipfs.io/ipfs/QmcVBQAbPMzEstPyaBoZ3J1dnE3t1horoX9WebLcCCYLR9/${tokenId}`,
          );
          const ipfsMetadata = await metadataResponse.json();

          // Use CloudFront CDN for image
          const metadata = {
            ...ipfsMetadata,
            tokenId: tokenId.toString(),
            image: `https://d2w8sp0plvpr8a.cloudfront.net/${tokenId}/body-transparent.png`,
          };

          robopetTokens.push({
            tokenId: tokenId.toString(),
            metadata,
            type: "robopet",
          });
        } catch (err) {
          // Add placeholder if metadata fetch fails
          const tokenId = await robopetContract.methods
            .tokenOfOwnerByIndex(address, i)
            .call();
          robopetTokens.push({
            tokenId: tokenId.toString(),
            metadata: {
              name: `Robopet #${tokenId}`,
              tokenId: tokenId.toString(),
              image: `https://d2w8sp0plvpr8a.cloudfront.net/${tokenId}/body-transparent.png`,
              attributes: [],
            },
            type: "robopet",
          });
        }
      }

      setRobopets(robopetTokens);
    } catch (err) {
      setError("Failed to load your Robotos and Robopets");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setRobotos([]);
      setRobopets([]);
      return;
    }

    fetchTokens();
  }, [address, fetchTokens]);

  return {
    robotos,
    robopets,
    allTokens: [...robotos, ...robopets],
    loading,
    error,
    refetch: fetchTokens,
  };
}
