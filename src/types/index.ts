export interface ENSProfile {
  name: string | null
  avatar: string | null
  address: `0x${string}`
  preferences: DeFiPreferences
}

export interface DeFiPreferences {
  slippage: number
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  favoritePairs: string[]
  maxTradeSize: number
  takeProfit: number
  stopLoss: number
  preferredChain: number
  sessionBudget: number
}

export interface Trade {
  id: string
  type: 'buy' | 'sell'
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  price: number
  timestamp: number
  status: 'pending' | 'executed' | 'failed'
}

export interface TradingSession {
  id: string
  channelId: string | null
  status: 'idle' | 'connecting' | 'active' | 'settling' | 'closed'
  balance: SessionBalance
  trades: Trade[]
  pnl: number
  startTime: number | null
}

export interface SessionBalance {
  usdc: number
  eth: number
  wbtc: number
  [token: string]: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tradeId?: string
}

export interface DepositState {
  status: 'idle' | 'quoting' | 'approving' | 'bridging' | 'depositing' | 'done' | 'error'
  sourceChain: number | null
  sourceToken: string | null
  amount: string
  quote: any | null
  txHash: string | null
  error: string | null
}

export interface PriceData {
  [symbol: string]: {
    usd: number
    usd_24h_change: number
  }
}
