'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ENSProfile } from '@/types'

interface ENSProfileProps {
  profile: ENSProfile
  isConnected: boolean
  hasENS: boolean
}

const RISK_COLORS: Record<
  ENSProfile['preferences']['riskLevel'],
  { bg: string; text: string; dot: string }
> = {
  conservative: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  moderate: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  aggressive: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatUSD(value: number): string {
  return value >= 1000
    ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    : `$${value}`
}

export function ENSProfile({ profile, isConnected, hasENS }: ENSProfileProps) {
  if (!isConnected) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-muted-foreground"
            >
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.5" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Connect wallet to load profile
          </p>
        </CardContent>
      </Card>
    )
  }

  const { preferences } = profile
  const risk = RISK_COLORS[preferences.riskLevel]

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-500/30 bg-emerald-500/10">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name ?? 'Avatar'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-emerald-400">
                {(profile.name ?? profile.address.slice(2, 4)).toUpperCase()}
              </span>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>

          {/* Name and address */}
          <div className="min-w-0 flex-1">
            {hasENS && profile.name ? (
              <>
                <CardTitle className="truncate text-sm">
                  {profile.name}
                </CardTitle>
                <p className="truncate text-xs text-muted-foreground font-mono">
                  {truncateAddress(profile.address)}
                </p>
              </>
            ) : (
              <>
                <CardTitle className="truncate text-sm font-mono">
                  {truncateAddress(profile.address)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  No ENS name found
                </p>
              </>
            )}
          </div>

          {/* Risk Badge */}
          <Badge
            variant="outline"
            className={`${risk.bg} ${risk.text} border-transparent text-[11px] capitalize`}
          >
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${risk.dot}`} />
            {preferences.riskLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasENS && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              No ENS name found. Preferences use defaults.
            </p>
          </div>
        )}

        <Separator />

        {/* Preferences Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <PreferenceStat
            label="Slippage"
            value={`${preferences.slippage}%`}
          />
          <PreferenceStat
            label="Max Trade"
            value={formatUSD(preferences.maxTradeSize)}
          />
          <PreferenceStat
            label="Take Profit"
            value={
              <span className="text-emerald-400">
                +{preferences.takeProfit}%
              </span>
            }
          />
          <PreferenceStat
            label="Stop Loss"
            value={
              <span className="text-red-400">
                -{preferences.stopLoss}%
              </span>
            }
          />
          <PreferenceStat
            label="Session Budget"
            value={formatUSD(preferences.sessionBudget)}
          />
          <PreferenceStat
            label="Chain"
            value={CHAIN_NAMES[preferences.preferredChain] ?? `Chain ${preferences.preferredChain}`}
          />
        </div>

        {/* Favorite Pairs */}
        {preferences.favoritePairs.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">
                Favorite Pairs
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preferences.favoritePairs.map((pair) => (
                  <Badge
                    key={pair}
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-[11px] font-mono"
                  >
                    {pair}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
}

function PreferenceStat({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
