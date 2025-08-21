"use client";

import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { InjectedConnector } from "wagmi/connectors/injected";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { RobotoTokensProvider } from "../contexts/RobotoTokensContext";

// Configure chains with multiple providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [
    publicProvider(), // Free public RPC
    alchemyProvider({ apiKey: "jwUAqVKEyazD8laQ6Vz224g085Ekr6zz" }), // Alchemy as backup
  ],
);

// Create wagmi config with connectors (without Web3Modal for now)
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RobotoTokensProvider>{children}</RobotoTokensProvider>
    </WagmiConfig>
  );
}
