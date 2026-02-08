import { TOKENS } from '../constants'
import type { PriceData } from '@/types'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

export async function fetchPrices(): Promise<PriceData> {
  const ids = Object.values(TOKENS).map(t => t.coingeckoId).filter((v, i, a) => a.indexOf(v) === i).join(',')

  try {
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    )

    if (!res.ok) throw new Error('Price fetch failed')

    const data = await res.json()
    const prices: PriceData = {}

    for (const [symbol, config] of Object.entries(TOKENS)) {
      const coinData = data[config.coingeckoId]
      if (coinData) {
        prices[symbol] = {
          usd: coinData.usd,
          usd_24h_change: coinData.usd_24h_change || 0,
        }
      }
    }

    // Always include USDC at $1
    prices['USDC'] = { usd: 1, usd_24h_change: 0 }

    return prices
  } catch {
    // Fallback prices for demo
    return {
      ETH: { usd: 3200, usd_24h_change: 1.5 },
      WBTC: { usd: 97000, usd_24h_change: 0.8 },
      WETH: { usd: 3200, usd_24h_change: 1.5 },
      USDC: { usd: 1, usd_24h_change: 0 },
    }
  }
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatTokenAmount(amount: number, decimals: number = 4): string {
  if (amount === 0) return '0'
  if (amount < 0.0001) return '<0.0001'
  return amount.toFixed(decimals)
}
