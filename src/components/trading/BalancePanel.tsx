'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { SessionBalance, PriceData } from '@/types'

interface BalancePanelProps {
  balance: SessionBalance
  prices: PriceData
  pnl: number
}

const TOKEN_META: Record<string, { symbol: string; label: string; decimals: number }> = {
  usdc: { symbol: 'USDC', label: 'USD Coin', decimals: 2 },
  eth: { symbol: 'ETH', label: 'Ethereum', decimals: 6 },
  wbtc: { symbol: 'WBTC', label: 'Wrapped BTC', decimals: 8 },
}

function getTokenMeta(key: string) {
  return (
    TOKEN_META[key.toLowerCase()] ?? {
      symbol: key.toUpperCase(),
      label: key.toUpperCase(),
      decimals: 4,
    }
  )
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 10_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAmount(amount: number, decimals: number): string {
  if (amount === 0) return '0'
  if (amount < 0.000001) return '<0.000001'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })
}

function getTokenPrice(symbol: string, prices: PriceData): number {
  const upper = symbol.toUpperCase()
  // USDC is pegged to $1
  if (upper === 'USDC') return 1
  // Check prices map with various key formats
  const entry =
    prices[upper] ??
    prices[symbol.toLowerCase()] ??
    prices[symbol]
  return entry?.usd ?? 0
}

function getTokenChange(symbol: string, prices: PriceData): number {
  const upper = symbol.toUpperCase()
  if (upper === 'USDC') return 0
  const entry =
    prices[upper] ??
    prices[symbol.toLowerCase()] ??
    prices[symbol]
  return entry?.usd_24h_change ?? 0
}

export function BalancePanel({ balance, prices, pnl }: BalancePanelProps) {
  const tokenEntries = useMemo(() => {
    return Object.entries(balance)
      .map(([key, amount]) => {
        const meta = getTokenMeta(key)
        const price = getTokenPrice(key, prices)
        const usdValue = amount * price
        const change24h = getTokenChange(key, prices)
        return { key, amount, meta, price, usdValue, change24h }
      })
      .sort((a, b) => b.usdValue - a.usdValue)
  }, [balance, prices])

  const totalValue = useMemo(() => {
    return tokenEntries.reduce((sum, entry) => sum + entry.usdValue, 0)
  }, [tokenEntries])

  const hasPositions = tokenEntries.some((e) => e.amount > 0)

  const pnlPercent = totalValue > 0 ? (pnl / (totalValue - pnl)) * 100 : 0

  return (
    <Card className="border-zinc-800/80 bg-zinc-950/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300">
            Portfolio
          </CardTitle>
          {hasPositions && (
            <div
              className={`text-xs font-mono font-semibold ${
                pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {pnl >= 0 ? '+' : ''}
              {formatUsd(pnl)}
              <span className="ml-1 text-[10px] opacity-70">
                ({pnl >= 0 ? '+' : ''}
                {pnlPercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Portfolio Value */}
        {hasPositions && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500">Total Value</span>
              <span className="text-lg font-mono font-bold text-zinc-100 tabular-nums">
                {formatUsd(totalValue)}
              </span>
            </div>
            <Separator className="bg-zinc-800/60" />
          </>
        )}

        {/* Token Rows */}
        {!hasPositions ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1">
            <span className="text-xs text-zinc-600">No active positions</span>
          </div>
        ) : (
          <div className="space-y-1">
            {tokenEntries.map((entry) => {
              if (entry.amount === 0) return null
              return (
                <div
                  key={entry.key}
                  className="flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-zinc-900/50 transition-colors"
                >
                  {/* Left: Token info */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700/50">
                      <span className="text-[10px] font-bold text-zinc-300">
                        {entry.meta.symbol.slice(0, 3)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-zinc-200">
                        {entry.meta.symbol}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {entry.price > 0
                          ? `$${entry.price.toLocaleString('en-US', {
                              maximumFractionDigits: 2,
                            })}`
                          : '--'}
                        {entry.change24h !== 0 && (
                          <span
                            className={`ml-1 ${
                              entry.change24h >= 0
                                ? 'text-emerald-500/70'
                                : 'text-red-500/70'
                            }`}
                          >
                            {entry.change24h >= 0 ? '+' : ''}
                            {entry.change24h.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount & USD value */}
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-mono text-zinc-200 tabular-nums">
                      {formatAmount(entry.amount, entry.meta.decimals)}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                      {formatUsd(entry.usdValue)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
