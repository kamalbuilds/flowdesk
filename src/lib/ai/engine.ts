import type { DeFiPreferences, SessionBalance, PriceData, Trade } from '@/types'
import { getSystemPrompt } from './prompts'

export interface TradeAction {
  action: 'trade'
  type: 'buy' | 'sell'
  tokenIn: string
  tokenOut: string
  amount: number
}

export interface AIResponse {
  message: string
  trade?: TradeAction
}

export function parseAIResponse(content: string): AIResponse {
  // Try to extract JSON trade action from the response
  try {
    // Check if the entire response is JSON
    const parsed = JSON.parse(content)
    if (parsed.action === 'trade') {
      return {
        message: '',
        trade: {
          action: 'trade',
          type: parsed.type,
          tokenIn: parsed.tokenIn?.toUpperCase() || 'USDC',
          tokenOut: parsed.tokenOut?.toUpperCase() || 'ETH',
          amount: parseFloat(parsed.amount),
        }
      }
    }
  } catch {
    // Not pure JSON, check for embedded JSON
    const jsonMatch = content.match(/\{[\s\S]*?"action"\s*:\s*"trade"[\s\S]*?\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        const textBefore = content.slice(0, content.indexOf(jsonMatch[0])).trim()
        const textAfter = content.slice(content.indexOf(jsonMatch[0]) + jsonMatch[0].length).trim()
        return {
          message: textBefore || textAfter || '',
          trade: {
            action: 'trade',
            type: parsed.type,
            tokenIn: parsed.tokenIn?.toUpperCase() || 'USDC',
            tokenOut: parsed.tokenOut?.toUpperCase() || 'ETH',
            amount: parseFloat(parsed.amount),
          }
        }
      } catch {
        // Invalid embedded JSON
      }
    }
  }

  return { message: content }
}

export function validateTrade(trade: TradeAction, preferences: DeFiPreferences, balance: SessionBalance, prices: PriceData): string | null {
  const priceIn = prices[trade.tokenIn]?.usd || 1
  const tradeValueUsd = trade.amount * priceIn

  if (tradeValueUsd > preferences.maxTradeSize) {
    return `Trade value ($${tradeValueUsd.toFixed(2)}) exceeds your max trade size ($${preferences.maxTradeSize}). Reduce amount or update your ENS preferences.`
  }

  const tokenKey = trade.tokenIn.toLowerCase()
  const available = balance[tokenKey] || 0
  if (available < trade.amount) {
    return `Insufficient ${trade.tokenIn} balance. Available: ${available.toFixed(4)}, Requested: ${trade.amount}`
  }

  return null
}

// Local AI for when no API key is available
export function localTradeParser(input: string, balance: SessionBalance, prices: PriceData): AIResponse {
  const lower = input.toLowerCase().trim()

  // Pattern: "buy $X of TOKEN" or "buy X TOKEN"
  const buyDollarMatch = lower.match(/buy\s+\$?(\d+(?:\.\d+)?)\s+(?:of\s+|worth\s+(?:of\s+)?)?(\w+)/i)
  if (buyDollarMatch) {
    const dollarAmount = parseFloat(buyDollarMatch[1])
    const token = buyDollarMatch[2].toUpperCase()

    if (token === 'USDC') {
      return { message: "You already have USDC! Did you mean to buy another token?" }
    }

    return {
      message: '',
      trade: {
        action: 'trade',
        type: 'buy',
        tokenIn: 'USDC',
        tokenOut: token === 'BITCOIN' || token === 'BTC' ? 'WBTC' : token,
        amount: dollarAmount,
      }
    }
  }

  // Pattern: "sell X TOKEN" or "sell $X of TOKEN"
  const sellMatch = lower.match(/sell\s+\$?(\d+(?:\.\d+)?)\s+(?:of\s+)?(\w+)/i)
  if (sellMatch) {
    const amount = parseFloat(sellMatch[1])
    const token = sellMatch[2].toUpperCase()
    const normalizedToken = token === 'BITCOIN' || token === 'BTC' ? 'WBTC' : token

    return {
      message: '',
      trade: {
        action: 'trade',
        type: 'sell',
        tokenIn: normalizedToken,
        tokenOut: 'USDC',
        amount: amount,
      }
    }
  }

  // Pattern: "swap X TOKEN for TOKEN2"
  const swapMatch = lower.match(/swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i)
  if (swapMatch) {
    const amount = parseFloat(swapMatch[1])
    const fromToken = swapMatch[2].toUpperCase()
    const toToken = swapMatch[3].toUpperCase()

    return {
      message: '',
      trade: {
        action: 'trade',
        type: 'buy',
        tokenIn: fromToken === 'BTC' ? 'WBTC' : fromToken,
        tokenOut: toToken === 'BTC' ? 'WBTC' : toToken,
        amount: amount,
      }
    }
  }

  // Portfolio query
  if (lower.includes('portfolio') || lower.includes('balance') || lower.includes('holdings')) {
    const entries = Object.entries(balance).filter(([_, v]) => v > 0)
    if (entries.length === 0) {
      return { message: "Your session has no active holdings. Open a session and deposit funds to start trading." }
    }

    let totalUsd = 0
    const lines = entries.map(([token, amount]) => {
      const price = prices[token.toUpperCase()]?.usd || (token === 'usdc' ? 1 : 0)
      const value = amount * price
      totalUsd += value
      return `- ${amount.toFixed(4)} ${token.toUpperCase()}: $${value.toFixed(2)}`
    })

    return {
      message: `Your current holdings:\n${lines.join('\n')}\n\nTotal value: $${totalUsd.toFixed(2)}`
    }
  }

  // Price query
  if (lower.includes('price') || lower.includes('how much')) {
    const lines = Object.entries(prices).map(([symbol, data]) => {
      const change = data.usd_24h_change >= 0 ? `+${data.usd_24h_change.toFixed(2)}%` : `${data.usd_24h_change.toFixed(2)}%`
      return `- ${symbol}: $${data.usd.toLocaleString()} (${change})`
    })
    return { message: `Current prices:\n${lines.join('\n')}` }
  }

  // Help
  if (lower.includes('help') || lower === 'hi' || lower === 'hello') {
    return {
      message: `Welcome to FlowDesk! I'm your AI trading copilot. Here's what I can do:

- **Buy tokens**: "Buy $100 of ETH" or "Buy $50 of WBTC"
- **Sell tokens**: "Sell 0.01 ETH" or "Sell $25 of WBTC"
- **Swap tokens**: "Swap 100 USDC for ETH"
- **Check portfolio**: "Show my portfolio" or "What's my balance?"
- **Check prices**: "Show prices" or "How much is ETH?"

All trades execute instantly via Yellow state channels - zero gas fees!`
    }
  }

  return {
    message: `I'm not sure what you mean. Try commands like:\n- "Buy $50 of ETH"\n- "Sell 0.01 ETH"\n- "Show my portfolio"\n- "Show prices"`
  }
}
