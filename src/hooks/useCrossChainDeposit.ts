'use client'

import { useState, useCallback } from 'react'
import type { DepositState } from '@/types'

const LIFI_API = 'https://li.quest/v1'

export function useCrossChainDeposit() {
  const [state, setState] = useState<DepositState>({
    status: 'idle',
    sourceChain: null,
    sourceToken: null,
    amount: '',
    quote: null,
    txHash: null,
    error: null,
  })

  const getQuote = useCallback(async (
    fromChain: number,
    fromToken: string,
    toChain: number,
    toToken: string,
    fromAmount: string,
    fromAddress: string
  ) => {
    setState(s => ({ ...s, status: 'quoting', error: null }))

    try {
      const params = new URLSearchParams({
        fromChain: fromChain.toString(),
        toChain: toChain.toString(),
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
      })

      const res = await fetch(`${LIFI_API}/quote?${params}`)

      if (!res.ok) {
        throw new Error('Failed to get quote from LI.FI')
      }

      const quote = await res.json()
      setState(s => ({ ...s, status: 'idle', quote }))
      return quote
    } catch (err: any) {
      setState(s => ({ ...s, status: 'idle', error: err.message }))
      return null
    }
  }, [])

  const executeDeposit = useCallback(async (quote: any) => {
    setState(s => ({ ...s, status: 'bridging' }))

    try {
      // In production, we'd use LI.FI SDK executeRoute
      // For demo, we simulate the deposit
      await new Promise(r => setTimeout(r, 3000))

      setState(s => ({
        ...s,
        status: 'done',
        txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      }))
    } catch (err: any) {
      setState(s => ({ ...s, status: 'error', error: err.message }))
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      sourceChain: null,
      sourceToken: null,
      amount: '',
      quote: null,
      txHash: null,
      error: null,
    })
  }, [])

  return {
    state,
    getQuote,
    executeDeposit,
    reset,
  }
}
