'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Trade, PriceData } from '@/types'

interface TradeHistoryProps {
  trades: Trade[]
  prices: PriceData
}

function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatPrice(price: number): string {
  if (price >= 10000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (price >= 0.01) {
    return price.toFixed(4)
  }
  return price.toFixed(6)
}

function formatTradeAmount(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  if (num >= 1000) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  if (num >= 1) {
    return num.toFixed(4)
  }
  return num.toFixed(6)
}

function StatusDot({ status }: { status: Trade['status'] }) {
  if (status === 'pending') {
    return (
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
    )
  }
  if (status === 'failed') {
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
  }
  return null
}

export function TradeHistory({ trades, prices }: TradeHistoryProps) {
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => b.timestamp - a.timestamp)
  }, [trades])

  return (
    <Card className="border-zinc-800/80 bg-zinc-950/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300">
            Trade History
          </CardTitle>
          {trades.length > 0 && (
            <span className="text-[10px] font-mono text-zinc-600">
              {trades.length} trade{trades.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sortedTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
              <svg
                className="h-5 w-5 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              No trades yet.
            </p>
            <p className="text-[10px] text-zinc-600 text-center">
              Start by telling the AI what to trade.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="px-4 pb-3 space-y-0.5">
              {sortedTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-zinc-900/50 transition-colors group"
                >
                  {/* Left side: Type badge + pair info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-1.5 py-0 h-5 shrink-0 border ${
                        trade.type === 'buy'
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-red-400 border-red-500/30 bg-red-500/10'
                      }`}
                    >
                      {trade.type === 'buy' ? 'BUY' : 'SELL'}
                    </Badge>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {trade.tokenIn.toUpperCase()}
                          <span className="text-zinc-600 mx-0.5">/</span>
                          {trade.tokenOut.toUpperCase()}
                        </span>
                        <StatusDot status={trade.status} />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <span className="font-mono tabular-nums">
                          {formatTradeAmount(trade.amountIn)} {trade.tokenIn.toUpperCase()}
                        </span>
                        <svg
                          className="h-2.5 w-2.5 text-zinc-600 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                        <span className="font-mono tabular-nums">
                          {formatTradeAmount(trade.amountOut)} {trade.tokenOut.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Price + time */}
                  <div className="flex flex-col items-end shrink-0 ml-3">
                    <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
                      ${formatPrice(trade.price)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {formatTimeAgo(trade.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
