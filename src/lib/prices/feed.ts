import type { PriceData } from '@/types'

const HERMES_URL = 'https://hermes.pyth.network'

// Pyth price feed IDs
const PYTH_FEEDS: Record<string, string> = {
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  WBTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
}

interface PythParsedFeed {
  id: string
  price: { price: string; conf: string; expo: number; publish_time: number }
  ema_price: { price: string; conf: string; expo: number; publish_time: number }
}

// Cache for computing 24h change
let lastPrices: Record<string, number> = {}
let lastFetchTime = 0

export async function fetchPrices(): Promise<PriceData> {
  const params = new URLSearchParams()
  Object.values(PYTH_FEEDS).forEach(id => params.append('ids[]', id))

  const res = await fetch(`${HERMES_URL}/v2/updates/price/latest?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 10 },
  })

  if (!res.ok) {
    throw new Error(`Pyth Hermes API error: ${res.status}`)
  }

  const data = await res.json()
  const parsed: PythParsedFeed[] = data.parsed

  // Build reverse lookup: feed ID (without 0x) -> symbol
  const feedIdToSymbol: Record<string, string> = {}
  for (const [symbol, feedId] of Object.entries(PYTH_FEEDS)) {
    feedIdToSymbol[feedId.replace('0x', '')] = symbol
  }

  const prices: PriceData = {}
  const now = Date.now()

  for (const feed of parsed) {
    const symbol = feedIdToSymbol[feed.id]
    if (!symbol) continue

    const rawPrice = Number(feed.price.price)
    const expo = feed.price.expo
    const usdPrice = rawPrice * Math.pow(10, expo)

    // Estimate 24h change from cached prices (Pyth doesn't provide this directly)
    let change24h = 0
    if (lastPrices[symbol] && (now - lastFetchTime) > 0) {
      change24h = ((usdPrice - lastPrices[symbol]) / lastPrices[symbol]) * 100
    }

    prices[symbol] = { usd: usdPrice, usd_24h_change: change24h }
    lastPrices[symbol] = usdPrice
  }

  // WETH = ETH price
  if (prices['ETH']) {
    prices['WETH'] = { ...prices['ETH'] }
  }

  lastFetchTime = now
  return prices
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
