import type { Trade, SessionBalance, TradingSession } from '@/types'
import { YELLOW_CONFIG } from '../constants'

type SessionListener = (session: TradingSession) => void

export class YellowClient {
  private ws: WebSocket | null = null
  private session: TradingSession
  private listeners: Set<SessionListener> = new Set()
  private mockMode: boolean = true // Use mock mode for demo

  constructor() {
    this.session = {
      id: '',
      channelId: null,
      status: 'idle',
      balance: { usdc: 0, eth: 0, wbtc: 0 },
      trades: [],
      pnl: 0,
      startTime: null,
    }
  }

  subscribe(listener: SessionListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.session }))
  }

  getSession(): TradingSession {
    return { ...this.session }
  }

  async connect(): Promise<void> {
    if (this.mockMode) {
      console.log('[Yellow] Mock mode: simulating Clearnode connection')
      return
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(YELLOW_CONFIG.CLEARNODE_WS)
        this.ws.onopen = () => {
          console.log('[Yellow] Connected to Clearnode')
          resolve()
        }
        this.ws.onerror = (err) => {
          console.error('[Yellow] WebSocket error:', err)
          reject(err)
        }
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data)
      console.log('[Yellow] Received:', msg)
      // Handle notifications from Clearnode
      if (Array.isArray(msg) && msg[1]) {
        switch (msg[1]) {
          case 'bu': // Balance Update
            console.log('[Yellow] Balance updated')
            break
          case 'cu': // Channel Update
            console.log('[Yellow] Channel updated')
            break
          case 'tr': // Transfer
            console.log('[Yellow] Transfer received')
            break
        }
      }
    } catch {
      console.error('[Yellow] Failed to parse message')
    }
  }

  async openSession(depositAmount: number): Promise<void> {
    this.session.status = 'connecting'
    this.session.id = `session-${Date.now()}`
    this.notify()

    if (this.mockMode) {
      // Simulate session opening with delay
      await new Promise(r => setTimeout(r, 1500))
      this.session.status = 'active'
      this.session.channelId = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      this.session.balance = { usdc: depositAmount, eth: 0, wbtc: 0 }
      this.session.startTime = Date.now()
      this.session.trades = []
      this.session.pnl = 0
      this.notify()
      return
    }

    // Real Yellow SDK flow would go here:
    // 1. Generate session key
    // 2. Auth with Clearnode (auth_request -> auth_challenge -> auth_verify)
    // 3. Create channel (createCreateChannelMessage)
    // 4. Deposit funds into custody contract
    // 5. Open state channel
    throw new Error('Live mode not yet implemented')
  }

  async executeTrade(
    type: 'buy' | 'sell',
    tokenIn: string,
    tokenOut: string,
    amount: number,
    prices: Record<string, { usd: number }>
  ): Promise<Trade> {
    if (this.session.status !== 'active') {
      throw new Error('No active trading session')
    }

    const priceIn = prices[tokenIn]?.usd || 1
    const priceOut = prices[tokenOut]?.usd || 1
    const amountInUsd = amount * priceIn
    const amountOut = amountInUsd / priceOut

    // Validate balance
    const tokenInKey = tokenIn.toLowerCase()
    if ((this.session.balance[tokenInKey] || 0) < amount) {
      throw new Error(`Insufficient ${tokenIn} balance. Have: ${this.session.balance[tokenInKey] || 0}, Need: ${amount}`)
    }

    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      tokenIn,
      tokenOut,
      amountIn: amount.toString(),
      amountOut: amountOut.toFixed(8),
      price: priceOut,
      timestamp: Date.now(),
      status: 'pending',
    }

    if (this.mockMode) {
      // Simulate instant off-chain execution
      await new Promise(r => setTimeout(r, 300))

      // Update balances
      this.session.balance[tokenInKey] = (this.session.balance[tokenInKey] || 0) - amount
      const tokenOutKey = tokenOut.toLowerCase()
      this.session.balance[tokenOutKey] = (this.session.balance[tokenOutKey] || 0) + amountOut

      trade.status = 'executed'
      this.session.trades.push(trade)

      // Calculate PnL
      this.calculatePnL(prices)
      this.notify()
      return trade
    }

    // Real flow: createTransferMessage via state channel
    throw new Error('Live mode not yet implemented')
  }

  private calculatePnL(prices: Record<string, { usd: number }>) {
    let totalValue = 0
    for (const [token, amount] of Object.entries(this.session.balance)) {
      const price = prices[token.toUpperCase()]?.usd || (token === 'usdc' ? 1 : 0)
      totalValue += amount * price
    }
    const initialValue = this.session.trades.length > 0
      ? parseFloat(this.session.trades[0].amountIn) * (prices[this.session.trades[0].tokenIn]?.usd || 1) + totalValue - totalValue
      : totalValue

    // Simple PnL: current value vs initial USDC deposit
    const initialDeposit = this.session.balance.usdc +
      Object.entries(this.session.balance)
        .filter(([k]) => k !== 'usdc')
        .reduce((sum, [token, amount]) => {
          return sum + amount * (prices[token.toUpperCase()]?.usd || 0)
        }, 0)

    // PnL is the difference from initial session funding
    this.session.pnl = totalValue - (this.session.trades[0] ?
      parseFloat(this.session.trades[0].type === 'buy' ? this.session.trades[0].amountIn : this.session.trades[0].amountOut) :
      totalValue)
  }

  async closeSession(): Promise<void> {
    if (this.session.status !== 'active') return

    this.session.status = 'settling'
    this.notify()

    if (this.mockMode) {
      // Simulate on-chain settlement
      await new Promise(r => setTimeout(r, 2000))
      this.session.status = 'closed'
      this.notify()
      return
    }

    // Real flow:
    // 1. createCloseChannelMessage
    // 2. Verify final allocations
    // 3. Submit on-chain via Custody.close()
    throw new Error('Live mode not yet implemented')
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.session.status = 'idle'
    this.notify()
  }
}

// Singleton instance
let yellowClient: YellowClient | null = null

export function getYellowClient(): YellowClient {
  if (!yellowClient) {
    yellowClient = new YellowClient()
  }
  return yellowClient
}
