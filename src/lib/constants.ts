export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', icon: '⟠' },
  { id: 42161, name: 'Arbitrum', icon: '🔵' },
  { id: 10, name: 'Optimism', icon: '🔴' },
  { id: 137, name: 'Polygon', icon: '🟣' },
  { id: 8453, name: 'Base', icon: '🔷' },
] as const

export const TOKENS: Record<string, { symbol: string; decimals: number; coingeckoId: string }> = {
  USDC: { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  ETH: { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
  WBTC: { symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
  WETH: { symbol: 'WETH', decimals: 18, coingeckoId: 'ethereum' },
}

export const TOKEN_ADDRESSES: Record<number, Record<string, `0x${string}`>> = {
  42161: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  },
  10: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    WETH: '0x4200000000000000000000000000000000000006',
    WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  },
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
  },
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    WETH: '0x4200000000000000000000000000000000000006',
  },
}

export const YELLOW_CONFIG = {
  CLEARNODE_WS: 'wss://clearnet-sandbox.yellow.com/ws',
  CHALLENGE_DURATION: 3600,
}

export const ENS_KEYS = {
  SLIPPAGE: 'com.flowdesk.slippage',
  RISK_LEVEL: 'com.flowdesk.risk-level',
  FAVORITE_PAIRS: 'com.flowdesk.favorite-pairs',
  MAX_TRADE_SIZE: 'com.flowdesk.max-trade-size',
  TAKE_PROFIT: 'com.flowdesk.take-profit',
  STOP_LOSS: 'com.flowdesk.stop-loss',
  PREFERRED_CHAIN: 'com.flowdesk.preferred-chain',
  SESSION_BUDGET: 'com.flowdesk.session-budget',
} as const

export const DEFAULT_PREFERENCES = {
  slippage: 0.5,
  riskLevel: 'moderate' as const,
  favoritePairs: ['ETH/USDC', 'WBTC/USDC'],
  maxTradeSize: 1000,
  takeProfit: 5,
  stopLoss: 3,
  preferredChain: 42161,
  sessionBudget: 500,
}
