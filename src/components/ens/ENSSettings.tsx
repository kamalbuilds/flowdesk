'use client'

import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { DeFiPreferences } from '@/types'

interface ENSSettingsProps {
  preferences: DeFiPreferences
  hasENS: boolean
  onSave?: (preferences: DeFiPreferences) => void
}

const CHAINS: { id: number; name: string }[] = [
  { id: 1, name: 'Ethereum' },
  { id: 42161, name: 'Arbitrum' },
  { id: 10, name: 'Optimism' },
  { id: 137, name: 'Polygon' },
  { id: 8453, name: 'Base' },
]

const RISK_LEVELS: {
  value: DeFiPreferences['riskLevel']
  label: string
  description: string
  color: string
  activeColor: string
  activeBorder: string
}[] = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Lower risk, smaller positions',
    color: 'text-blue-400',
    activeColor: 'bg-blue-500/15 text-blue-400',
    activeBorder: 'border-blue-500/50',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced risk/reward',
    color: 'text-yellow-400',
    activeColor: 'bg-yellow-500/15 text-yellow-400',
    activeBorder: 'border-yellow-500/50',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Higher risk, larger positions',
    color: 'text-red-400',
    activeColor: 'bg-red-500/15 text-red-400',
    activeBorder: 'border-red-500/50',
  },
]

export function ENSSettings({ preferences, hasENS, onSave }: ENSSettingsProps) {
  const [form, setForm] = useState<DeFiPreferences>({ ...preferences })
  const [isSaving, setIsSaving] = useState(false)

  const updateField = useCallback(
    <K extends keyof DeFiPreferences>(key: K, value: DeFiPreferences[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      onSave(form)
    } finally {
      setIsSaving(false)
    }
  }, [form, onSave])

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-base">Trading Preferences</CardTitle>
        <CardDescription>
          Configure your DeFi trading parameters for FlowDesk.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ENS Status Banner */}
        {!hasENS && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-400">
                  No ENS Name Detected
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Preferences will be stored locally in your browser. Register an
                  ENS name to save preferences on-chain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Risk Level */}
        <FieldGroup label="Risk Level" description="Determines position sizing and strategy aggressiveness.">
          <div className="grid grid-cols-3 gap-2">
            {RISK_LEVELS.map((level) => {
              const isActive = form.riskLevel === level.value
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => updateField('riskLevel', level.value)}
                  className={`
                    flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center transition-all
                    ${
                      isActive
                        ? `${level.activeBorder} ${level.activeColor}`
                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                    }
                  `}
                >
                  <span className="text-sm font-medium">{level.label}</span>
                  <span className="text-[11px] opacity-70">
                    {level.description}
                  </span>
                </button>
              )
            })}
          </div>
        </FieldGroup>

        <Separator />

        {/* Trade Parameters */}
        <FieldGroup label="Trade Parameters">
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Slippage Tolerance"
              suffix="%"
              value={form.slippage}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(v) => updateField('slippage', v)}
              description="0.1% - 5%"
            />
            <NumberField
              label="Max Trade Size"
              prefix="$"
              suffix="USDC"
              value={form.maxTradeSize}
              min={1}
              max={1000000}
              step={100}
              onChange={(v) => updateField('maxTradeSize', v)}
            />
            <NumberField
              label="Take Profit"
              suffix="%"
              value={form.takeProfit}
              min={0.5}
              max={500}
              step={0.5}
              onChange={(v) => updateField('takeProfit', v)}
              description="Target exit on profit"
              positive
            />
            <NumberField
              label="Stop Loss"
              suffix="%"
              value={form.stopLoss}
              min={0.5}
              max={100}
              step={0.5}
              onChange={(v) => updateField('stopLoss', v)}
              description="Max drawdown before exit"
              negative
            />
            <NumberField
              label="Session Budget"
              prefix="$"
              suffix="USDC"
              value={form.sessionBudget}
              min={1}
              max={1000000}
              step={100}
              onChange={(v) => updateField('sessionBudget', v)}
              description="Max spend per session"
            />
          </div>
        </FieldGroup>

        <Separator />

        {/* Preferred Chain */}
        <FieldGroup label="Preferred Chain" description="Default chain for trade execution.">
          <div className="flex flex-wrap gap-2">
            {CHAINS.map((chain) => {
              const isActive = form.preferredChain === chain.id
              return (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => updateField('preferredChain', chain.id)}
                  className={`
                    rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
                    ${
                      isActive
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                    }
                  `}
                >
                  {chain.name}
                </button>
              )
            })}
          </div>
        </FieldGroup>

        <Separator />

        {/* Favorite Pairs */}
        <FieldGroup
          label="Favorite Pairs"
          description="Comma-separated trading pairs (e.g. ETH/USDC, WBTC/ETH)."
        >
          <Input
            value={form.favoritePairs.join(', ')}
            onChange={(e) => {
              const pairs = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
              updateField('favoritePairs', pairs)
            }}
            placeholder="ETH/USDC, WBTC/ETH, ARB/USDC"
            className="font-mono text-sm"
          />
          {form.favoritePairs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.favoritePairs.map((pair) => (
                <Badge
                  key={pair}
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono"
                >
                  {pair}
                </Badge>
              ))}
            </div>
          )}
        </FieldGroup>
      </CardContent>

      <Separator />

      <CardFooter className="flex-col items-stretch gap-3 pt-6">
        <Button
          onClick={handleSave}
          disabled={isSaving || !onSave}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </>
          ) : hasENS ? (
            'Save to ENS'
          ) : (
            'Save Locally'
          )}
        </Button>

        {hasENS ? (
          <p className="text-center text-xs text-muted-foreground">
            This writes preferences as ENS text records. A transaction will be
            submitted and gas fees apply.
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Saved to browser storage. Register an ENS name to persist on-chain.
          </p>
        )}

        <Separator />

        <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-emerald-400">Portability: </span>
            Preferences stored as ENS text records are portable across all DeFi
            apps that support the ENS profile standard.
          </p>
        </div>
      </CardFooter>
    </Card>
  )
}

/* ---------- Sub-components ---------- */

function FieldGroup({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  description,
  positive,
  negative,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  description?: string
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value)
            if (!isNaN(parsed)) {
              const clamped = Math.min(
                max ?? Infinity,
                Math.max(min ?? -Infinity, parsed)
              )
              onChange(clamped)
            }
          }}
          className={`
            text-sm font-mono
            ${prefix ? 'pl-7' : ''}
            ${suffix ? 'pr-14' : ''}
            ${positive ? 'text-emerald-400' : ''}
            ${negative ? 'text-red-400' : ''}
          `}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
