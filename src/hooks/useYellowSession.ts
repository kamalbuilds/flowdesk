'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { getYellowClient, YellowClient } from '@/lib/yellow/client'
import type { TradingSession, Trade, PriceData } from '@/types'

export function useYellowSession() {
  const clientRef = useRef<YellowClient | null>(null)
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [session, setSession] = useState<TradingSession>({
    id: '',
    channelId: null,
    status: 'idle',
    balance: { usdc: 0, eth: 0, wbtc: 0 },
    trades: [],
    pnl: 0,
    startTime: null,
  })

  useEffect(() => {
    const client = getYellowClient()
    clientRef.current = client

    const unsubscribe = client.subscribe(setSession)
    return () => {
      unsubscribe()
    }
  }, [])

  // Pass walletClient to YellowClient when available
  useEffect(() => {
    const client = clientRef.current
    if (client && walletClient && address) {
      client.setWalletClient(walletClient, address)
    }
  }, [walletClient, address])

  const openSession = useCallback(async (depositAmount: number) => {
    const client = clientRef.current
    if (!client) return
    await client.connect()
    await client.openSession(depositAmount)
  }, [])

  const executeTrade = useCallback(async (
    type: 'buy' | 'sell',
    tokenIn: string,
    tokenOut: string,
    amount: number,
    prices: PriceData
  ): Promise<Trade> => {
    const client = clientRef.current
    if (!client) throw new Error('Client not initialized')
    return client.executeTrade(type, tokenIn, tokenOut, amount, prices)
  }, [])

  const closeSession = useCallback(async () => {
    const client = clientRef.current
    if (!client) return
    await client.closeSession()
  }, [])

  return {
    session,
    openSession,
    executeTrade,
    closeSession,
    isActive: session.status === 'active',
    isConnecting: session.status === 'connecting',
    isSettling: session.status === 'settling',
  }
}
