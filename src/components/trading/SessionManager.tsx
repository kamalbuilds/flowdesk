'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { TradingSession } from '@/types'

interface SessionManagerProps {
  session: TradingSession
  onOpenSession: (amount: number) => Promise<void>
  onCloseSession: () => Promise<void>
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? 'h-4 w-4'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const parts: string[] = []
  if (hrs > 0) parts.push(`${hrs}h`)
  parts.push(`${String(mins).padStart(2, '0')}m`)
  parts.push(`${String(secs).padStart(2, '0')}s`)
  return parts.join(' ')
}

function truncateChannelId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

export function SessionManager({ session, onOpenSession, onCloseSession }: SessionManagerProps) {
  const [depositAmount, setDepositAmount] = useState(500)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Duration timer for active sessions
  useEffect(() => {
    if (session.status !== 'active' || !session.startTime) {
      setElapsed(0)
      return
    }

    const calcElapsed = () => Math.floor((Date.now() - session.startTime!) / 1000)
    setElapsed(calcElapsed())

    const interval = setInterval(() => {
      setElapsed(calcElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [session.status, session.startTime])

  const handleOpen = useCallback(async () => {
    if (depositAmount <= 0) return
    setIsLoading(true)
    try {
      await onOpenSession(depositAmount)
    } finally {
      setIsLoading(false)
    }
  }, [depositAmount, onOpenSession])

  const handleClose = useCallback(async () => {
    setIsLoading(true)
    try {
      await onCloseSession()
    } finally {
      setIsLoading(false)
    }
  }, [onCloseSession])

  // --- IDLE ---
  if (session.status === 'idle') {
    return (
      <Card className="border-emerald-500/20 bg-zinc-950/80">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-300">
            Start Trading Session
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Open a state channel to begin instant off-chain trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Deposit Amount (USDC)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="font-mono bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
                placeholder="500"
              />
              <div className="flex gap-1">
                {[100, 500, 1000].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="xs"
                    onClick={() => setDepositAmount(preset)}
                    className={`text-xs border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-400 ${
                      depositAmount === preset
                        ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                        : 'text-zinc-500'
                    }`}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Button
            onClick={handleOpen}
            disabled={isLoading || depositAmount <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4 mr-1" />
                Opening...
              </>
            ) : (
              'Open Session'
            )}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <span className="text-[10px] text-zinc-600">
            Powered by Yellow State Channels
          </span>
        </CardFooter>
      </Card>
    )
  }

  // --- CONNECTING ---
  if (session.status === 'connecting') {
    return (
      <Card className="border-emerald-500/20 bg-zinc-950/80">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <Spinner className="h-6 w-6 text-emerald-500" />
          <p className="text-sm text-zinc-300 font-medium">
            Opening state channel...
          </p>
          <p className="text-xs text-zinc-600">
            Depositing funds and establishing peer connection
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <span className="text-[10px] text-zinc-600">
            Powered by Yellow State Channels
          </span>
        </CardFooter>
      </Card>
    )
  }

  // --- ACTIVE ---
  if (session.status === 'active') {
    return (
      <Card className="border-emerald-500/30 bg-zinc-950/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-300">
              Trading Session
            </CardTitle>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {session.channelId && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Channel</span>
              <span className="text-xs font-mono text-zinc-400">
                {truncateChannelId(session.channelId)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Duration</span>
            <span className="text-xs font-mono text-emerald-400 tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Trades</span>
            <span className="text-xs font-mono text-zinc-300">
              {session.trades.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">P&L</span>
            <span
              className={`text-xs font-mono font-semibold ${
                session.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {session.pnl >= 0 ? '+' : ''}
              ${session.pnl.toFixed(2)}
            </span>
          </div>
          <Separator className="bg-zinc-800" />
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4 mr-1" />
                Closing...
              </>
            ) : (
              'Close Session'
            )}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <span className="text-[10px] text-zinc-600">
            Powered by Yellow State Channels
          </span>
        </CardFooter>
      </Card>
    )
  }

  // --- SETTLING ---
  if (session.status === 'settling') {
    return (
      <Card className="border-yellow-500/20 bg-zinc-950/80">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <Spinner className="h-6 w-6 text-yellow-500" />
          <p className="text-sm text-zinc-300 font-medium">
            Settling on-chain...
          </p>
          <p className="text-xs text-zinc-600">
            Finalizing balances and closing the state channel
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <span className="text-[10px] text-zinc-600">
            Powered by Yellow State Channels
          </span>
        </CardFooter>
      </Card>
    )
  }

  // --- CLOSED ---
  return (
    <Card className="border-zinc-800 bg-zinc-950/80">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          Session Closed
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Final settlement complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Total Trades</span>
          <span className="text-xs font-mono text-zinc-300">
            {session.trades.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Final P&L</span>
          <span
            className={`text-sm font-mono font-bold ${
              session.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {session.pnl >= 0 ? '+' : ''}
            ${session.pnl.toFixed(2)}
          </span>
        </div>
        <Separator className="bg-zinc-800" />
        <Button
          onClick={() => {
            setDepositAmount(500)
            handleOpen()
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        >
          New Session
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <span className="text-[10px] text-zinc-600">
          Powered by Yellow State Channels
        </span>
      </CardFooter>
    </Card>
  )
}
