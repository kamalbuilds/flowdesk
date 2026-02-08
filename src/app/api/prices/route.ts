import { NextResponse } from 'next/server'
import { fetchPrices } from '@/lib/prices/feed'

export async function GET() {
  try {
    const prices = await fetchPrices()
    return NextResponse.json(prices)
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to fetch prices from Pyth: ${err.message}` },
      { status: 502 }
    )
  }
}
