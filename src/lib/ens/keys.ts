import { ENS_KEYS, DEFAULT_PREFERENCES } from '../constants'
import type { DeFiPreferences } from '@/types'

export function parseENSPreferences(records: Record<string, string | null>): DeFiPreferences {
  return {
    slippage: records[ENS_KEYS.SLIPPAGE] ? parseFloat(records[ENS_KEYS.SLIPPAGE]!) : DEFAULT_PREFERENCES.slippage,
    riskLevel: (records[ENS_KEYS.RISK_LEVEL] as DeFiPreferences['riskLevel']) || DEFAULT_PREFERENCES.riskLevel,
    favoritePairs: records[ENS_KEYS.FAVORITE_PAIRS]?.split(',') || DEFAULT_PREFERENCES.favoritePairs,
    maxTradeSize: records[ENS_KEYS.MAX_TRADE_SIZE] ? parseInt(records[ENS_KEYS.MAX_TRADE_SIZE]!) : DEFAULT_PREFERENCES.maxTradeSize,
    takeProfit: records[ENS_KEYS.TAKE_PROFIT] ? parseFloat(records[ENS_KEYS.TAKE_PROFIT]!) : DEFAULT_PREFERENCES.takeProfit,
    stopLoss: records[ENS_KEYS.STOP_LOSS] ? parseFloat(records[ENS_KEYS.STOP_LOSS]!) : DEFAULT_PREFERENCES.stopLoss,
    preferredChain: records[ENS_KEYS.PREFERRED_CHAIN] ? parseInt(records[ENS_KEYS.PREFERRED_CHAIN]!) : DEFAULT_PREFERENCES.preferredChain,
    sessionBudget: records[ENS_KEYS.SESSION_BUDGET] ? parseFloat(records[ENS_KEYS.SESSION_BUDGET]!) : DEFAULT_PREFERENCES.sessionBudget,
  }
}

export function serializePreferences(prefs: DeFiPreferences): Array<{ key: string; value: string }> {
  return [
    { key: ENS_KEYS.SLIPPAGE, value: prefs.slippage.toString() },
    { key: ENS_KEYS.RISK_LEVEL, value: prefs.riskLevel },
    { key: ENS_KEYS.FAVORITE_PAIRS, value: prefs.favoritePairs.join(',') },
    { key: ENS_KEYS.MAX_TRADE_SIZE, value: prefs.maxTradeSize.toString() },
    { key: ENS_KEYS.TAKE_PROFIT, value: prefs.takeProfit.toString() },
    { key: ENS_KEYS.STOP_LOSS, value: prefs.stopLoss.toString() },
    { key: ENS_KEYS.PREFERRED_CHAIN, value: prefs.preferredChain.toString() },
    { key: ENS_KEYS.SESSION_BUDGET, value: prefs.sessionBudget.toString() },
  ]
}
