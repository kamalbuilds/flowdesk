'use client'

import { useState, useCallback } from 'react'
import { useYellowSession } from './useYellowSession'
import { usePrices } from './usePrices'
import { useENSProfile } from './useENSProfile'
import { localTradeParser, validateTrade, type TradeAction } from '@/lib/ai/engine'
import { getSystemPrompt } from '@/lib/ai/prompts'
import type { ChatMessage } from '@/types'

export function useTradingEngine() {
  const { session, openSession, executeTrade, closeSession, isActive } = useYellowSession()
  const { prices } = usePrices()
  const { preferences } = useENSProfile()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const addMessage = useCallback((role: ChatMessage['role'], content: string, tradeId?: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role,
      content,
      timestamp: Date.now(),
      tradeId,
    }
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const handleTradeAction = useCallback(async (trade: TradeAction): Promise<string> => {
    // Validate trade
    const error = validateTrade(trade, preferences, session.balance, prices)
    if (error) return error

    try {
      const result = await executeTrade(
        trade.type,
        trade.tokenIn,
        trade.tokenOut,
        trade.amount,
        prices
      )

      const priceOut = prices[trade.tokenOut]?.usd || 0
      return `Trade executed instantly via Yellow state channel (zero gas):
- ${trade.type.toUpperCase()}: ${result.amountIn} ${trade.tokenIn} -> ${parseFloat(result.amountOut).toFixed(6)} ${trade.tokenOut}
- Price: $${priceOut.toLocaleString()}
- Status: Confirmed off-chain`
    } catch (err: any) {
      return `Trade failed: ${err.message}`
    }
  }, [executeTrade, preferences, session.balance, prices])

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isProcessing) return

    addMessage('user', input)
    setIsProcessing(true)

    try {
      // Try API first, fall back to local parser
      let aiResponse: { message: string; trade?: TradeAction } | null = null

      try {
        const systemPrompt = getSystemPrompt(preferences, session.balance, prices)
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: input }],
            systemPrompt,
          }),
        })
        const data = await res.json()

        if (data.useLocal || !data.content) {
          throw new Error('Use local')
        }

        // Parse AI response for trade actions
        const { parseAIResponse } = await import('@/lib/ai/engine')
        aiResponse = parseAIResponse(data.content)
      } catch {
        // Use local parser
        aiResponse = localTradeParser(input, session.balance, prices)
      }

      if (aiResponse?.trade && isActive) {
        // Execute the trade
        const result = await handleTradeAction(aiResponse.trade)
        addMessage('assistant', result)
      } else if (aiResponse?.trade && !isActive) {
        addMessage('assistant', 'Please open a trading session first before executing trades. Click "Start Session" above.')
      } else {
        addMessage('assistant', aiResponse?.message || "I couldn't understand that. Try 'help' for available commands.")
      }
    } catch (err: any) {
      addMessage('system', `Error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, addMessage, preferences, session.balance, prices, isActive, handleTradeAction])

  return {
    session,
    messages,
    isProcessing,
    prices,
    preferences,
    sendMessage,
    openSession,
    closeSession,
    isActive,
  }
}
