export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', logo: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 8453, name: 'Base', logo: 'https://coin-images.coingecko.com/asset_platforms/images/131/small/base.png' },
  { id: 137, name: 'Polygon', logo: 'https://coin-images.coingecko.com/coins/images/4713/small/polygon.png' },
  { id: 42161, name: 'Arbitrum', logo: 'https://coin-images.coingecko.com/coins/images/16547/small/arb.jpg' },
  { id: 10, name: 'Optimism', logo: 'https://coin-images.coingecko.com/coins/images/25244/small/Optimism.png' },
] as const

// Chains with Nitrolite custody contracts deployed
export const NITROLITE_CHAINS = {
  // Production mainnets
  MAINNET: { id: 1, custody: '0x6F71a38d919ad713D0AfE0eB712b95064Fc2616f' as const },
  BASE: { id: 8453, custody: '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6' as const },
  POLYGON: { id: 137, custody: '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6' as const },
  // Sandbox testnets
  SEPOLIA: { id: 11155111, custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const },
  BASE_SEPOLIA: { id: 84532, custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const },
  POLYGON_AMOY: { id: 80002, custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const },
  LINEA_SEPOLIA: { id: 59141, custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const },
} as const

export const TOKENS: Record<string, { symbol: string; decimals: number; coingeckoId: string }> = {
  USDC: { symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  ETH: { symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
  WBTC: { symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
  WETH: { symbol: 'WETH', decimals: 18, coingeckoId: 'ethereum' },
}

export const TOKEN_ADDRESSES: Record<number, Record<string, `0x${string}`>> = {
  // Mainnet
  1: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  // Base
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  // Polygon
  137: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
  },
  // Arbitrum (for LI.FI deposits)
  42161: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  },
  // Optimism (for LI.FI deposits)
  10: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    WETH: '0x4200000000000000000000000000000000000006',
    WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  },
}

export const YELLOW_CONFIG = {
  CLEARNODE_WS: 'wss://clearnet-sandbox.yellow.com/ws',
  CLEARNODE_WS_PROD: 'wss://clearnet.yellow.com/ws',
  CHALLENGE_DURATION: 3600,
  // Default to Base Sepolia for sandbox testing
  DEFAULT_CHAIN_ID: 84532,
  ADJUDICATOR: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as `0x${string}`,
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
  preferredChain: 84532, // Base Sepolia for testing
  sessionBudget: 500,
}
