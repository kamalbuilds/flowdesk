import type { Trade, SessionBalance, TradingSession } from '@/types'
import { YELLOW_CONFIG } from '../constants'
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createCreateChannelMessage,
  createCloseChannelMessage,
  createTransferMessage,
  createGetLedgerBalancesMessage,
  createPingMessageV2,
  parseAnyRPCResponse,
  generateRequestId,
  RPCMethod,
  createECDSAMessageSigner,
  type MessageSigner,
} from '@erc7824/nitrolite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { Hex, Address, WalletClient } from 'viem'

type SessionListener = (session: TradingSession) => void

export class YellowClient {
  private ws: WebSocket | null = null
  private session: TradingSession
  private listeners: Set<SessionListener> = new Set()
  private sessionKey: Hex | null = null
  private sessionKeyAddress: Address | null = null
  private walletClient: WalletClient | null = null
  private walletAddress: Address | null = null
  private messageSigner: MessageSigner | null = null
  private jwtToken: string | null = null
  private isAuthenticated: boolean = false
  private authExpiresAt: bigint | null = null
  private clearNodeAddress: Address | null = null
  private initialDeposit: number = 0
  private pendingRequests: Map<number, { resolve: (data: any) => void; reject: (err: Error) => void }> = new Map()
  private pingInterval: ReturnType<typeof setInterval> | null = null

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

  setWalletClient(walletClient: WalletClient, address: Address) {
    this.walletClient = walletClient
    this.walletAddress = address
  }

  private createSessionKeySigner(): MessageSigner {
    if (!this.sessionKey) throw new Error('No session key')
    return createECDSAMessageSigner(this.sessionKey)
  }

  async connect(): Promise<void> {
    // Clean up any existing connection
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Generate session key for this connection
    this.sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(this.sessionKey)
    this.sessionKeyAddress = sessionAccount.address
    this.messageSigner = this.createSessionKeySigner()

    console.log('[Yellow] Session key generated:', this.sessionKeyAddress)

    await this.connectWebSocket()
    console.log('[Yellow] Connected to ClearNode')
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ClearNode connection timeout (10s)'))
      }, 10000)

      try {
        this.ws = new WebSocket(YELLOW_CONFIG.CLEARNODE_WS)

        this.ws.onopen = async () => {
          clearTimeout(timeout)
          console.log('[Yellow] WebSocket connected to ClearNode')

          try {
            await this.authenticate()
            this.startPing()
            resolve()
          } catch (authErr) {
            reject(authErr)
          }
        }

        this.ws.onerror = (err) => {
          clearTimeout(timeout)
          console.error('[Yellow] WebSocket error:', err)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          console.log('[Yellow] WebSocket closed')
          this.isAuthenticated = false
          this.stopPing()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as string)
        }
      } catch (err) {
        clearTimeout(timeout)
        reject(err)
      }
    })
  }

  private async authenticate(): Promise<void> {
    if (!this.walletClient || !this.walletAddress || !this.sessionKeyAddress) {
      throw new Error('Wallet not configured. Call setWalletClient() first.')
    }

    return new Promise(async (resolve, reject) => {
      const authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout (15s)'))
      }, 15000)

      const authHandler = (success: boolean, jwtToken?: string) => {
        clearTimeout(authTimeout)
        if (success) {
          this.isAuthenticated = true
          if (jwtToken) this.jwtToken = jwtToken
          console.log('[Yellow] Authentication successful')
          resolve()
        } else {
          reject(new Error('ClearNode authentication failed'))
        }
      }

      ;(this as any)._authHandler = authHandler

      try {
        // Use consistent expiry for both auth_request and EIP-712 signing
        this.authExpiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600)

        const authRequestMsg = await createAuthRequestMessage({
          address: this.walletAddress!,
          session_key: this.sessionKeyAddress!,
          application: 'FlowDesk',
          expires_at: this.authExpiresAt,
          scope: 'console',
          allowances: [
            { asset: 'ytest.usd', amount: '1000000000' },
            { asset: 'eth', amount: '10000000000000000000' },
          ],
        })

        this.send(authRequestMsg)
        console.log('[Yellow] Auth request sent')
      } catch (err) {
        clearTimeout(authTimeout)
        reject(err)
      }
    })
  }

  private async handleMessage(data: string) {
    try {
      const response = parseAnyRPCResponse(data)
      console.log('[Yellow] Received:', response.method)

      switch (response.method) {
        case RPCMethod.AuthChallenge: {
          if (!this.walletClient || !this.sessionKeyAddress) break

          const challengeResponse = response as import('@erc7824/nitrolite').AuthChallengeResponse

          const eip712Signer = createEIP712AuthMessageSigner(
            this.walletClient,
            {
              scope: 'console',
              session_key: this.sessionKeyAddress,
              expires_at: this.authExpiresAt!,
              allowances: [
                { asset: 'ytest.usd', amount: '1000000000' },
                { asset: 'eth', amount: '10000000000000000000' },
              ],
            },
            { name: 'FlowDesk' }
          )

          const authVerifyMsg = await createAuthVerifyMessage(
            eip712Signer,
            challengeResponse,
          )

          this.send(authVerifyMsg)
          console.log('[Yellow] Auth verify sent')
          break
        }

        case RPCMethod.AuthVerify: {
          const verifyResponse = response as import('@erc7824/nitrolite').AuthVerifyResponse
          const authHandler = (this as any)._authHandler
          if (authHandler) {
            authHandler(verifyResponse.params?.success ?? false, verifyResponse.params?.jwtToken)
            delete (this as any)._authHandler
          }
          break
        }

        case RPCMethod.Error: {
          const params = (response as any).params
          console.error('[Yellow] RPC Error:', params?.error)

          const authHandler = (this as any)._authHandler
          if (authHandler) {
            authHandler(false)
            delete (this as any)._authHandler
          }

          const requestId = (response as any).requestId
          if (requestId && this.pendingRequests.has(requestId)) {
            const pending = this.pendingRequests.get(requestId)!
            this.pendingRequests.delete(requestId)
            pending.reject(new Error(params?.error || 'RPC Error'))
          }
          break
        }

        case RPCMethod.CreateChannel:
        case RPCMethod.CloseChannel:
        case RPCMethod.Transfer:
        case RPCMethod.GetLedgerBalances:
        case RPCMethod.GetConfig:
        case RPCMethod.ResizeChannel: {
          const requestId = (response as any).requestId
          if (requestId && this.pendingRequests.has(requestId)) {
            const pending = this.pendingRequests.get(requestId)!
            this.pendingRequests.delete(requestId)
            pending.resolve((response as any).params)
          }
          break
        }

        case RPCMethod.BalanceUpdate:
          console.log('[Yellow] Balance update notification')
          break

        case RPCMethod.ChannelUpdate:
          console.log('[Yellow] Channel update notification')
          break

        case RPCMethod.TransferNotification:
          console.log('[Yellow] Transfer notification')
          break

        case RPCMethod.Pong:
          break

        default:
          console.log('[Yellow] Unhandled method:', response.method)
      }
    } catch (err) {
      try {
        const raw = JSON.parse(data)
        console.log('[Yellow] Raw message:', raw)

        if (raw.res && raw.res[1] === 'auth_challenge') {
          if (this.messageSigner) {
            const authVerifyMsg = await createAuthVerifyMessage(
              this.messageSigner,
              data as any,
            )
            this.send(authVerifyMsg)
          }
        } else if (raw.res && raw.res[1] === 'auth_verify') {
          const authHandler = (this as any)._authHandler
          if (authHandler) {
            const params = raw.res[2]
            authHandler(params?.success ?? true, params?.jwtToken)
            delete (this as any)._authHandler
          }
        }
      } catch {
        console.error('[Yellow] Failed to parse message:', data.slice(0, 200))
      }
    }
  }

  private send(message: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    this.ws.send(message)
  }

  private sendRequest(message: string, requestId?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (requestId) this.pendingRequests.delete(requestId)
        reject(new Error('Request timeout (15s)'))
      }, 15000)

      if (requestId) {
        this.pendingRequests.set(requestId, {
          resolve: (data) => {
            clearTimeout(timeout)
            resolve(data)
          },
          reject: (err) => {
            clearTimeout(timeout)
            reject(err)
          },
        })
      }

      try {
        this.send(message)
      } catch (err) {
        clearTimeout(timeout)
        if (requestId) this.pendingRequests.delete(requestId)
        reject(err)
      }
    })
  }

  private startPing() {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      try {
        const pingMsg = createPingMessageV2()
        this.send(pingMsg)
      } catch {
        // Connection might be closed
      }
    }, 30000)
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  async openSession(depositAmount: number): Promise<void> {
    this.session.status = 'connecting'
    this.session.id = `session-${Date.now()}`
    this.initialDeposit = depositAmount
    this.notify()

    if (!this.messageSigner || !this.walletAddress) {
      throw new Error('Not authenticated with ClearNode')
    }

    // Request faucet tokens for sandbox testing
    try {
      const faucetRes = await fetch('https://clearnet-sandbox.yellow.com/faucet/requestTokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: this.walletAddress }),
      })
      const faucetData = await faucetRes.json()
      console.log('[Yellow] Faucet:', faucetData.message, `(${faucetData.amount} ${faucetData.asset})`)
    } catch (err) {
      console.log('[Yellow] Faucet request failed (may already have tokens)')
    }

    // Create channel
    const requestId = generateRequestId()
    const createMsg = await createCreateChannelMessage(
      this.messageSigner,
      {
        chain_id: YELLOW_CONFIG.DEFAULT_CHAIN_ID,
        token: '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' as Address, // ytest.usd on sandbox
      },
      requestId,
    )

    const result = await this.sendRequest(createMsg, requestId)

    // Extract ClearNode address from channel participants
    this.clearNodeAddress = result?.channel?.participants?.[1]
      || result?.state?.allocations?.[1]?.destination
      || null

    // Check unified balance
    try {
      const balReqId = generateRequestId()
      const balMsg = await createGetLedgerBalancesMessage(this.messageSigner, undefined, balReqId)
      const balResult = await this.sendRequest(balMsg, balReqId)
      console.log('[Yellow] Unified balance:', JSON.stringify(balResult?.ledgerBalances || []))
    } catch {
      console.log('[Yellow] Could not fetch ledger balances')
    }

    this.session.status = 'active'
    this.session.channelId = result?.channelId || result?.channel_id || null
    this.session.balance = { usdc: depositAmount, eth: 0, wbtc: 0 }
    this.session.startTime = Date.now()
    this.session.trades = []
    this.session.pnl = 0
    this.notify()

    console.log('[Yellow] Session active, channel:', this.session.channelId, 'ClearNode:', this.clearNodeAddress)
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

    // Execute transfer via Nitrolite RPC
    if (this.messageSigner && this.session.channelId) {
      const requestId = generateRequestId()

      const transferMsg = await createTransferMessage(
        this.messageSigner,
        {
          destination: this.clearNodeAddress || undefined,
          allocations: [
            { asset: 'ytest.usd', amount: amount.toString() },
          ],
        },
        requestId,
      )

      await this.sendRequest(transferMsg, requestId)
      console.log('[Yellow] Transfer executed via state channel')
    }

    // Update local balances
    this.session.balance[tokenInKey] = (this.session.balance[tokenInKey] || 0) - amount
    const tokenOutKey = tokenOut.toLowerCase()
    this.session.balance[tokenOutKey] = (this.session.balance[tokenOutKey] || 0) + amountOut

    trade.status = 'executed'
    this.session.trades.push(trade)

    this.calculatePnL(prices)
    this.notify()
    return trade
  }

  private calculatePnL(prices: Record<string, { usd: number }>) {
    let totalValue = 0
    for (const [token, amount] of Object.entries(this.session.balance)) {
      if (amount === 0) continue
      const price = token === 'usdc' ? 1 : (prices[token.toUpperCase()]?.usd || 0)
      totalValue += amount * price
    }
    this.session.pnl = totalValue - this.initialDeposit
  }

  async closeSession(): Promise<void> {
    if (this.session.status !== 'active') return

    this.session.status = 'settling'
    this.notify()

    if (this.messageSigner && this.session.channelId && this.walletAddress) {
      try {
        const requestId = generateRequestId()
        const closeMsg = await createCloseChannelMessage(
          this.messageSigner,
          this.session.channelId as `0x${string}`,
          this.walletAddress,
          requestId,
        )

        await this.sendRequest(closeMsg, requestId)
        console.log('[Yellow] Channel closed via Nitrolite')
      } catch (err: any) {
        // ClearNode may return "channel not found" if already settled or expired.
        // Log but don't block session closure.
        console.warn('[Yellow] Channel close error (settling anyway):', err.message)
      }
    }

    this.session.status = 'closed'
    this.notify()
  }

  disconnect() {
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isAuthenticated = false
    this.jwtToken = null
    this.pendingRequests.clear()
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
