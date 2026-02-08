'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCrossChainDeposit } from '@/hooks/useCrossChainDeposit'
import { SUPPORTED_CHAINS } from '@/lib/constants'
import type { DepositState } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_CHAIN_ID = 42161 // Arbitrum
const TARGET_TOKEN = 'USDC'

const SOURCE_TOKENS = [
  { symbol: 'USDC', label: 'USDC', icon: '$' },
  { symbol: 'ETH', label: 'ETH', icon: '\u039E' },
  { symbol: 'WBTC', label: 'WBTC', icon: '\u20BF' },
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CrossChainDepositProps {
  onDepositComplete?: (amount: number) => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isActive = step === current
        const isCompleted = step < current

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isActive
                    ? 'border border-emerald-500 text-emerald-400'
                    : 'border border-zinc-700 text-zinc-500'
              }`}
            >
              {isCompleted ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                step
              )}
            </div>
            {i < total - 1 && (
              <div
                className={`h-px w-6 transition-colors ${
                  isCompleted ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SpinnerIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8a6.5 6.5 0 00-6.5-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function ChainSelection({
  selectedChain,
  onSelect,
}: {
  selectedChain: number | null
  onSelect: (chainId: number) => void
}) {
  // Filter out Arbitrum from source chains since it is the target
  const sourceChains = SUPPORTED_CHAINS.filter((c) => c.id !== TARGET_CHAIN_ID)

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Select the network where your funds currently reside.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {sourceChains.map((chain) => {
          const isSelected = selectedChain === chain.id
          return (
            <button
              key={chain.id}
              onClick={() => onSelect(chain.id)}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                isSelected
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
              }`}
            >
              <span className="text-lg leading-none">{chain.icon}</span>
              <span>{chain.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TokenAmountInput({
  selectedToken,
  amount,
  onTokenSelect,
  onAmountChange,
}: {
  selectedToken: string | null
  amount: string
  onTokenSelect: (symbol: string) => void
  onAmountChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Token</label>
        <div className="flex gap-2">
          {SOURCE_TOKENS.map((token) => {
            const isSelected = selectedToken === token.symbol
            return (
              <button
                key={token.symbol}
                onClick={() => onTokenSelect(token.symbol)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                }`}
              >
                <span className="text-base leading-none">{token.icon}</span>
                <span>{token.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Amount</label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          min="0"
          step="any"
          className="h-12 border-zinc-800 bg-zinc-900/50 text-lg font-medium text-zinc-100 placeholder:text-zinc-600 focus-visible:border-emerald-500/60 focus-visible:ring-emerald-500/20"
        />
      </div>
    </div>
  )
}

function QuotePreview({
  quote,
  sourceChainId,
  sourceToken,
  amount,
}: {
  quote: any
  sourceChainId: number
  sourceToken: string
  amount: string
}) {
  const sourceChain = SUPPORTED_CHAINS.find((c) => c.id === sourceChainId)
  const targetChain = SUPPORTED_CHAINS.find((c) => c.id === TARGET_CHAIN_ID)

  const estimatedOutput = quote?.estimate?.toAmountMin
    ? (Number(quote.estimate.toAmountMin) / 1e6).toFixed(2)
    : parseFloat(amount || '0').toFixed(2)

  const gasCostUSD = quote?.estimate?.gasCosts?.[0]?.amountUSD ?? '~0.50'
  const executionDuration = quote?.estimate?.executionDuration
    ? `~${Math.ceil(quote.estimate.executionDuration / 60)} min`
    : '~2 min'

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <span>{sourceChain?.icon}</span>
            <span>{sourceChain?.name}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-600">
            <path d="M3 8h10m0 0L9.5 4.5M13 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex items-center gap-2 text-zinc-400">
            <span>{targetChain?.icon}</span>
            <span>{targetChain?.name}</span>
          </div>
        </div>

        <Separator className="my-3 bg-zinc-800" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">You send</span>
            <span className="font-medium text-zinc-200">
              {amount} {sourceToken}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">You receive</span>
            <span className="font-medium text-emerald-400">{estimatedOutput} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Gas cost</span>
            <span className="text-zinc-400">${gasCostUSD}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Est. time</span>
            <span className="text-zinc-400">{executionDuration}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400/80">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.167A5.833 5.833 0 1012.833 7 5.84 5.84 0 007 1.167zm0 9.333V6.417m0-2.334h.006" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Funds will be deposited into your FlowDesk trading session on Arbitrum.</span>
      </div>
    </div>
  )
}

function BridgingProgress({ status }: { status: DepositState['status'] }) {
  const stages = [
    { key: 'approving', label: 'Approving token spend' },
    { key: 'bridging', label: 'Bridging assets cross-chain' },
    { key: 'depositing', label: 'Depositing into session' },
  ]

  const activeIndex = stages.findIndex((s) => s.key === status)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
        <SpinnerIcon className="text-emerald-400" />
        <span>
          {status === 'approving' && 'Waiting for token approval...'}
          {status === 'bridging' && 'Bridging assets cross-chain...'}
          {status === 'depositing' && 'Depositing into your session...'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out"
          style={{
            width:
              status === 'approving'
                ? '30%'
                : status === 'bridging'
                  ? '60%'
                  : status === 'depositing'
                    ? '85%'
                    : '100%',
          }}
        />
      </div>

      {/* Stage list */}
      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const isCurrent = stage.key === status
          const isComplete = i < activeIndex

          return (
            <div key={stage.key} className="flex items-center gap-2.5 text-sm">
              {isComplete ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : isCurrent ? (
                <div className="flex h-5 w-5 items-center justify-center">
                  <PulsingDot />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                </div>
              )}
              <span
                className={
                  isComplete
                    ? 'text-emerald-400/80'
                    : isCurrent
                      ? 'text-zinc-200'
                      : 'text-zinc-600'
                }
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SuccessView({
  txHash,
  amount,
  onDone,
}: {
  txHash: string | null
  amount: string
  onDone: () => void
}) {
  const truncatedHash = txHash
    ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
    : null

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="space-y-1">
        <p className="text-lg font-semibold text-zinc-100">Deposit Successful</p>
        <p className="text-sm text-zinc-400">
          {amount} USDC deposited into your trading session
        </p>
      </div>

      {truncatedHash && (
        <Badge
          variant="outline"
          className="border-zinc-700 bg-zinc-900/50 font-mono text-xs text-zinc-400"
        >
          tx: {truncatedHash}
        </Badge>
      )}

      <Button
        onClick={onDone}
        variant="outline"
        className="mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      >
        Make another deposit
      </Button>
    </div>
  )
}

function ErrorView({
  error,
  onRetry,
}: {
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-400">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="space-y-1">
        <p className="text-lg font-semibold text-zinc-100">Deposit Failed</p>
        <p className="text-sm text-red-400/90">{error ?? 'An unexpected error occurred.'}</p>
      </div>

      <Button
        onClick={onRetry}
        variant="outline"
        className="mt-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        Try again
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CrossChainDeposit({ onDepositComplete }: CrossChainDepositProps) {
  const { state, getQuote, executeDeposit, reset } = useCrossChainDeposit()

  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [amount, setAmount] = useState('')

  // Derive the current step from local + hook state
  const currentStep = (() => {
    if (state.status === 'done') return 5
    if (['approving', 'bridging', 'depositing'].includes(state.status)) return 4
    if (state.quote) return 3
    if (selectedChain) return 2
    return 1
  })()

  // ------ handlers ------

  const handleChainSelect = useCallback((chainId: number) => {
    setSelectedChain(chainId)
    setSelectedToken(null)
    setAmount('')
  }, [])

  const handleGetQuote = useCallback(async () => {
    if (!selectedChain || !selectedToken || !amount) return

    // Use a placeholder address for quoting
    const fromAddress = '0x0000000000000000000000000000000000000000'
    const tokenAddress = selectedToken === 'ETH' ? '0x0000000000000000000000000000000000000000' : selectedToken
    const toToken = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // USDC on Arbitrum

    const decimals = selectedToken === 'ETH' ? 18 : selectedToken === 'WBTC' ? 8 : 6
    const parsedAmount = (parseFloat(amount) * 10 ** decimals).toFixed(0)

    await getQuote(selectedChain, tokenAddress, TARGET_CHAIN_ID, toToken, parsedAmount, fromAddress)
  }, [selectedChain, selectedToken, amount, getQuote])

  const handleExecute = useCallback(async () => {
    if (!state.quote) return
    await executeDeposit(state.quote)
    if (onDepositComplete) {
      onDepositComplete(parseFloat(amount))
    }
  }, [state.quote, executeDeposit, amount, onDepositComplete])

  const handleReset = useCallback(() => {
    reset()
    setSelectedChain(null)
    setSelectedToken(null)
    setAmount('')
  }, [reset])

  const handleBack = useCallback(() => {
    if (state.quote) {
      // Clear quote, go back to step 2
      reset()
      return
    }
    if (selectedToken || amount) {
      setSelectedToken(null)
      setAmount('')
      return
    }
    setSelectedChain(null)
  }, [state.quote, selectedToken, amount, reset])

  // ------ render ------

  const isProcessing = ['quoting', 'approving', 'bridging', 'depositing'].includes(state.status)
  const canProceedToQuote = selectedChain && selectedToken && amount && parseFloat(amount) > 0
  const showBackButton = currentStep > 1 && currentStep < 4

  return (
    <Card className="border-zinc-800 bg-zinc-950 text-zinc-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base text-zinc-100">Cross-Chain Deposit</CardTitle>
            <CardDescription className="text-zinc-500">
              Bridge &amp; deposit into your trading session
            </CardDescription>
          </div>
          {currentStep < 4 && <StepIndicator current={currentStep} total={3} />}
        </div>
      </CardHeader>

      <CardContent>
        {/* ----- Error ----- */}
        {state.status === 'error' && <ErrorView error={state.error} onRetry={handleReset} />}

        {/* ----- Success ----- */}
        {state.status === 'done' && (
          <SuccessView txHash={state.txHash} amount={amount} onDone={handleReset} />
        )}

        {/* ----- Processing ----- */}
        {['approving', 'bridging', 'depositing'].includes(state.status) && (
          <BridgingProgress status={state.status} />
        )}

        {/* ----- Idle steps ----- */}
        {state.status === 'idle' && !state.quote && !selectedChain && (
          <ChainSelection selectedChain={selectedChain} onSelect={handleChainSelect} />
        )}

        {state.status === 'idle' && !state.quote && selectedChain && (
          <TokenAmountInput
            selectedToken={selectedToken}
            amount={amount}
            onTokenSelect={setSelectedToken}
            onAmountChange={setAmount}
          />
        )}

        {/* ----- Quoting spinner ----- */}
        {state.status === 'quoting' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <SpinnerIcon className="h-6 w-6 text-emerald-400" />
            <p className="text-sm text-zinc-400">Finding best route via LI.FI...</p>
          </div>
        )}

        {/* ----- Quote preview ----- */}
        {state.status === 'idle' && state.quote && selectedChain && selectedToken && (
          <QuotePreview
            quote={state.quote}
            sourceChainId={selectedChain}
            sourceToken={selectedToken}
            amount={amount}
          />
        )}

        {/* ----- Action buttons ----- */}
        {state.status === 'idle' && currentStep < 4 && (
          <div className="mt-4 flex gap-2">
            {showBackButton && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Back
              </Button>
            )}

            {currentStep === 2 && (
              <Button
                disabled={!canProceedToQuote}
                onClick={handleGetQuote}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Get Quote
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                onClick={handleExecute}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Confirm &amp; Deposit
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 12h10M12 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Powered by LI.FI</span>
        </div>
      </CardFooter>
    </Card>
  )
}
