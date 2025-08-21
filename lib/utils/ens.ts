import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const ALCHEMY_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_KEY || "J5JRKzNp7V3nTPqqryLLHECH1SnyJJvt";

const client = createPublicClient({
  chain: mainnet,
  transport: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`),
});

export async function getEnsNameForAddress(
  address: string,
): Promise<string | null> {
  try {
    const ensName = await client.getEnsName({
      address: address as `0x${string}`,
    });
    return ensName;
  } catch (error) {
    console.error("Error fetching ENS name:", error);
    return null;
  }
}
