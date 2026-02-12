"use client"

import React, { useState, useEffect } from "react"
import { WagmiProvider, createConfig, http, injected } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConnectKitProvider, getDefaultConfig } from "connectkit"

import {
  LensProvider,
  PublicClient,
  mainnet,
  testnet,
} from "@lens-protocol/react"
import { chains } from "@lens-chain/sdk/viem"
import { walletConnect } from "wagmi/connectors"

type ConnectKitConfig = Parameters<typeof getDefaultConfig>[0]

const mainnetNetwork = {
  id: chains.mainnet.id,
  name: "Lens Chain",
  nativeCurrency: {
    name: "GHO",
    symbol: "GHO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.lens.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "LensExplorerScan",
      url: "https://explorer.lens.xyz",
      apiUrl: "",
    },
  },
}

const appConfigs = {
  production: {
    connectkit: {
      chains: [mainnetNetwork],
      transports: {
        [mainnetNetwork.id]: http(),
      },
    } as Partial<ConnectKitConfig>,
    lens: {
      environment: mainnet,
    },
  },
}

const configMainnet = createConfig(
  getDefaultConfig({
    appName: "LCTips.xyz",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
    ssr: false,
    ...appConfigs.production.connectkit,
  })
)
const configTestnet = createConfig({
  chains: [chains.testnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
    }),
  ],
  transports: {
    [chains.testnet.id]: http(),
  },
})

const queryClient = new QueryClient()

export function Web3Provider({
  children,
  network,
}: {
  children: React.ReactNode
  network: "mainnet" | "testnet"
}) {
  const [lensClient, setLensClient] = useState<PublicClient | null>(null)

  useEffect(() => {
    const client = PublicClient.create({
      environment: network === "mainnet" ? mainnet : testnet,
      storage: window.localStorage,
    })
    setLensClient(client)
  }, [])

  if (!lensClient) {
    return null
  }

  return (
    <WagmiProvider
      config={network === "mainnet" ? configMainnet : configTestnet}
    >
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          {lensClient && (
            <LensProvider client={lensClient}>{children}</LensProvider>
          )}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
