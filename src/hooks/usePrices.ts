'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PriceData } from '@/types'

const DEFAULT_PRICES: PriceData = {
  ETH: { usd: 3200, usd_24h_change: 1.5 },
  WBTC: { usd: 97000, usd_24h_change: 0.8 },
  WETH: { usd: 3200, usd_24h_change: 1.5 },
  USDC: { usd: 1, usd_24h_change: 0 },
}

export function usePrices() {
  const [prices, setPrices] = useState<PriceData>(DEFAULT_PRICES)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/prices')
      if (res.ok) {
        const data = await res.json()
        setPrices(data)
      }
    } catch {
      // Keep existing prices
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [refresh])

  return { prices, loading, refresh }
}
