'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useTradingEngine } from '@/hooks/useTradingEngine'
import { useENSProfile } from '@/hooks/useENSProfile'
import { useCrossChainDeposit } from '@/hooks/useCrossChainDeposit'
import { ChatPanel } from '@/components/trading/ChatPanel'
import { SessionManager } from '@/components/trading/SessionManager'
import { BalancePanel } from '@/components/trading/BalancePanel'
import { TradeHistory } from '@/components/trading/TradeHistory'
import { ENSProfile as ENSProfileCard } from '@/components/ens/ENSProfile'
import { ENSSettings } from '@/components/ens/ENSSettings'
import { CrossChainDeposit } from '@/components/deposit/CrossChainDeposit'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

export default function Home() {
  const { isConnected } = useAccount()
  const {
    session,
    messages,
    isProcessing,
    prices,
    preferences,
    sendMessage,
    openSession,
    closeSession,
    isActive,
  } = useTradingEngine()
  const { profile, hasENS } = useENSProfile()
  const [rightTab, setRightTab] = useState('session')

  const handleDepositComplete = (amount: number) => {
    if (!isActive) {
      openSession(amount)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="text-emerald-500">Flow</span>Desk
          </h1>
          <span className="text-xs text-muted-foreground">
            AI Trading Copilot
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isActive && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-500 font-medium">Session Active</span>
            </div>
          )}
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="avatar"
          />
        </div>
      </header>

      {/* Main Content */}
      {!isConnected ? (
        <div className="flex flex-1 items-center justify-center overflow-auto">
          <div className="max-w-md text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                <span className="text-emerald-500">Flow</span>Desk
              </h2>
              <p className="text-muted-foreground">
                AI-powered DeFi trading with instant off-chain execution
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="space-y-1 rounded-lg border border-border p-3">
                <div className="text-emerald-500 font-medium">Zero Gas</div>
                <div>Yellow state channels</div>
              </div>
              <div className="space-y-1 rounded-lg border border-border p-3">
                <div className="text-emerald-500 font-medium">Any Chain</div>
                <div>LI.FI cross-chain</div>
              </div>
              <div className="space-y-1 rounded-lg border border-border p-3">
                <div className="text-emerald-500 font-medium">Portable ID</div>
                <div>ENS preferences</div>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Chat */}
          <div className="flex flex-1 flex-col border-r border-border">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              isProcessing={isProcessing}
              isSessionActive={isActive}
            />
          </div>

          {/* Right Panel - Controls */}
          <div className="flex w-[380px] flex-col overflow-hidden">
            {/* ENS Profile Header */}
            <div className="border-b border-border p-4">
              <ENSProfileCard
                profile={profile}
                isConnected={isConnected}
                hasENS={hasENS}
              />
            </div>

            {/* Tabbed Controls */}
            <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="mx-4 mt-3 grid w-auto grid-cols-4">
                <TabsTrigger value="session" className="text-xs">Session</TabsTrigger>
                <TabsTrigger value="deposit" className="text-xs">Deposit</TabsTrigger>
                <TabsTrigger value="trades" className="text-xs">Trades</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="session" className="mt-0 space-y-4">
                  <SessionManager
                    session={session}
                    onOpenSession={openSession}
                    onCloseSession={closeSession}
                  />
                  <Separator />
                  <BalancePanel
                    balance={session.balance}
                    prices={prices}
                    pnl={session.pnl}
                  />
                </TabsContent>

                <TabsContent value="deposit" className="mt-0">
                  <CrossChainDeposit
                    onDepositComplete={handleDepositComplete}
                  />
                </TabsContent>

                <TabsContent value="trades" className="mt-0">
                  <TradeHistory
                    trades={session.trades}
                    prices={prices}
                  />
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
                  <ENSSettings
                    preferences={preferences}
                    hasENS={hasENS}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-border px-6 py-2 text-[10px] text-muted-foreground">
        <span>Yellow Network &middot; LI.FI &middot; ENS</span>
        <span>ETHGlobal HackMoney 2026</span>
      </footer>
    </div>
  )
}
