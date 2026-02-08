import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, arbitrum, optimism, polygon, base, sepolia, baseSepolia, polygonAmoy, lineaSepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'FlowDesk',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo-project-id',
  chains: [
    // Mainnets (Yellow production)
    mainnet,
    base,
    polygon,
    // Testnets (Yellow sandbox)
    sepolia,
    baseSepolia,
    polygonAmoy,
    lineaSepolia,
    // Other L2s (for LI.FI cross-chain)
    arbitrum,
    optimism,
  ],
  ssr: true,
})
