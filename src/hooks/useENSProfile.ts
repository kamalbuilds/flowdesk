'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useEnsName, useEnsAvatar, useEnsText } from 'wagmi'
import { normalize } from 'viem/ens'
import { ENS_KEYS, DEFAULT_PREFERENCES } from '@/lib/constants'
import type { ENSProfile, DeFiPreferences } from '@/types'

export function useENSProfile() {
  const { address, isConnected } = useAccount()

  const { data: ensName } = useEnsName({
    address,
    chainId: 1,
    query: { enabled: isConnected },
  })

  const normalizedName = useMemo(() => {
    if (!ensName) return undefined
    try {
      return normalize(ensName)
    } catch {
      return undefined
    }
  }, [ensName])

  const { data: avatar } = useEnsAvatar({
    name: normalizedName,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  // Read each ENS text record for DeFi preferences
  const { data: slippage } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.SLIPPAGE,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: riskLevel } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.RISK_LEVEL,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: favoritePairs } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.FAVORITE_PAIRS,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: maxTradeSize } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.MAX_TRADE_SIZE,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: takeProfit } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.TAKE_PROFIT,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: stopLoss } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.STOP_LOSS,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: preferredChain } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.PREFERRED_CHAIN,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const { data: sessionBudget } = useEnsText({
    name: normalizedName,
    key: ENS_KEYS.SESSION_BUDGET,
    chainId: 1,
    query: { enabled: !!normalizedName },
  })

  const preferences: DeFiPreferences = useMemo(() => ({
    slippage: slippage ? parseFloat(slippage) : DEFAULT_PREFERENCES.slippage,
    riskLevel: (riskLevel as DeFiPreferences['riskLevel']) || DEFAULT_PREFERENCES.riskLevel,
    favoritePairs: favoritePairs?.split(',').map(s => s.trim()) || DEFAULT_PREFERENCES.favoritePairs,
    maxTradeSize: maxTradeSize ? parseInt(maxTradeSize) : DEFAULT_PREFERENCES.maxTradeSize,
    takeProfit: takeProfit ? parseFloat(takeProfit) : DEFAULT_PREFERENCES.takeProfit,
    stopLoss: stopLoss ? parseFloat(stopLoss) : DEFAULT_PREFERENCES.stopLoss,
    preferredChain: preferredChain ? parseInt(preferredChain) : DEFAULT_PREFERENCES.preferredChain,
    sessionBudget: sessionBudget ? parseFloat(sessionBudget) : DEFAULT_PREFERENCES.sessionBudget,
  }), [slippage, riskLevel, favoritePairs, maxTradeSize, takeProfit, stopLoss, preferredChain, sessionBudget])

  const profile: ENSProfile = useMemo(() => ({
    name: ensName || null,
    avatar: avatar || null,
    address: address || '0x0' as `0x${string}`,
    preferences,
  }), [ensName, avatar, address, preferences])

  return {
    profile,
    preferences,
    ensName,
    avatar,
    isConnected,
    hasENS: !!ensName,
  }
}
