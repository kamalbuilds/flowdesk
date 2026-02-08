import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, arbitrum, optimism, polygon, base } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'FlowDesk',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo-project-id',
  chains: [mainnet, arbitrum, optimism, polygon, base],
  ssr: true,
})
