import { NextResponse } from 'next/server'
import { fetchPrices } from '@/lib/prices/feed'

export async function GET() {
  try {
    const prices = await fetchPrices()
    return NextResponse.json(prices)
  } catch {
    return NextResponse.json({
      ETH: { usd: 3200, usd_24h_change: 1.5 },
      WBTC: { usd: 97000, usd_24h_change: 0.8 },
      WETH: { usd: 3200, usd_24h_change: 1.5 },
      USDC: { usd: 1, usd_24h_change: 0 },
    })
  }
}
