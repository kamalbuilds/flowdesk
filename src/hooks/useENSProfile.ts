'use client'

import { useMemo } from 'react'
import { useAccount, useReadContracts } from 'wagmi'
import { namehash } from 'viem'
import { normalize } from 'viem/ens'
import { ENS_KEYS, DEFAULT_PREFERENCES } from '@/lib/constants'
import type { ENSProfile, DeFiPreferences } from '@/types'

// Basenames contracts on Base Sepolia
const L2_RESOLVER = '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA' as const
const REVERSE_REGISTRAR = '0x876eF94ce0773052a2f81921E70FF25a5e76841f' as const
const BASE_SEPOLIA_CHAIN_ID = 84532

const reverseRegistrarABI = [
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'node',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const

const resolverABI = [
  {
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    name: 'text',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useENSProfile() {
  const { address, isConnected } = useAccount()

  // Step 1: Get the reverse node from the ReverseRegistrar (Basenames uses its own node computation)
  const { data: reverseNodeData } = useReadContracts({
    contracts: address ? [
      {
        address: REVERSE_REGISTRAR,
        abi: reverseRegistrarABI,
        functionName: 'node',
        args: [address],
        chainId: BASE_SEPOLIA_CHAIN_ID,
      },
    ] : [],
    query: { enabled: !!address },
  })

  const reverseNode = reverseNodeData?.[0]?.result as `0x${string}` | undefined

  // Step 2: Get name from L2 Resolver using the reverse node
  const { data: nameData } = useReadContracts({
    contracts: reverseNode ? [
      {
        address: L2_RESOLVER,
        abi: resolverABI,
        functionName: 'name',
        args: [reverseNode],
        chainId: BASE_SEPOLIA_CHAIN_ID,
      },
    ] : [],
    query: { enabled: !!reverseNode },
  })

  const ensName = (nameData?.[0]?.result as string) || null

  // Step 3: If we have a name, compute its node and read text records from L2 Resolver
  const nameNode = useMemo(() => {
    if (!ensName) return undefined
    try {
      return namehash(normalize(ensName))
    } catch {
      return undefined
    }
  }, [ensName])

  const textKeys = Object.values(ENS_KEYS)
  const { data: textData } = useReadContracts({
    contracts: nameNode ? textKeys.map(key => ({
      address: L2_RESOLVER,
      abi: resolverABI,
      functionName: 'text' as const,
      args: [nameNode, key] as const,
      chainId: BASE_SEPOLIA_CHAIN_ID,
    })) : [],
    query: { enabled: !!nameNode },
  })

  // Build preferences from text records
  const preferences: DeFiPreferences = useMemo(() => {
    if (!textData) return DEFAULT_PREFERENCES

    const get = (idx: number) => (textData[idx]?.result as string) || ''

    const slippage = get(0)
    const riskLevel = get(1)
    const favoritePairs = get(2)
    const maxTradeSize = get(3)
    const takeProfit = get(4)
    const stopLoss = get(5)
    const preferredChain = get(6)
    const sessionBudget = get(7)

    return {
      slippage: slippage ? parseFloat(slippage) : DEFAULT_PREFERENCES.slippage,
      riskLevel: (riskLevel as DeFiPreferences['riskLevel']) || DEFAULT_PREFERENCES.riskLevel,
      favoritePairs: favoritePairs ? favoritePairs.split(',').map(s => s.trim()) : DEFAULT_PREFERENCES.favoritePairs,
      maxTradeSize: maxTradeSize ? parseInt(maxTradeSize) : DEFAULT_PREFERENCES.maxTradeSize,
      takeProfit: takeProfit ? parseFloat(takeProfit) : DEFAULT_PREFERENCES.takeProfit,
      stopLoss: stopLoss ? parseFloat(stopLoss) : DEFAULT_PREFERENCES.stopLoss,
      preferredChain: preferredChain ? parseInt(preferredChain) : DEFAULT_PREFERENCES.preferredChain,
      sessionBudget: sessionBudget ? parseFloat(sessionBudget) : DEFAULT_PREFERENCES.sessionBudget,
    }
  }, [textData])

  const profile: ENSProfile = useMemo(() => ({
    name: ensName,
    avatar: null, // Basenames don't have avatar records by default
    address: address || '0x0' as `0x${string}`,
    preferences,
  }), [ensName, address, preferences])

  return {
    profile,
    preferences,
    ensName,
    avatar: null,
    isConnected,
    hasENS: !!ensName,
  }
}
