import { createConfig as createLifiConfig, EVM, ChainId } from '@lifi/sdk'
import { getWalletClient, switchChain } from '@wagmi/core'
import { config as wagmiConfig } from '../wagmi-config'

let lifiInitialized = false

export function initLifi() {
  if (lifiInitialized) return

  createLifiConfig({
    integrator: 'flowdesk-hackmoney',
    providers: [
      EVM({
        getWalletClient: () => getWalletClient(wagmiConfig),
        switchChain: async (chainId: number) => {
          const chain = await switchChain(wagmiConfig, { chainId: chainId as any })
          return getWalletClient(wagmiConfig, { chainId: chain.id })
        },
      }),
    ],
  })

  lifiInitialized = true
}
