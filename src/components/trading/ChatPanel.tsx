"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types"
import {
  Send,
  Bot,
  BarChart3,
  Wallet,
  HelpCircle,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isProcessing: boolean
  isSessionActive: boolean
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function isTradeConfirmation(content: string): boolean {
  const lower = content.toLowerCase()
  return lower.includes("trade executed") || content.includes("\u2705")
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <span className="size-1.5 animate-[bounce_1.4s_infinite_0ms] rounded-full bg-emerald-500" />
      <span className="size-1.5 animate-[bounce_1.4s_infinite_200ms] rounded-full bg-emerald-500" />
      <span className="size-1.5 animate-[bounce_1.4s_infinite_400ms] rounded-full bg-emerald-500" />
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const isAssistant = message.role === "assistant"
  const isTrade = isTradeConfirmation(message.content)

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1.5">
        <div className="flex items-center gap-2 rounded-md bg-zinc-800/50 px-3 py-1.5 max-w-[85%]">
          <AlertCircle className="size-3 shrink-0 text-zinc-500" />
          <span className="font-mono text-xs text-zinc-500">
            {message.content}
          </span>
          <span className="ml-auto font-mono text-[10px] text-zinc-600">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-sm bg-emerald-600/20 border border-emerald-500/20 px-4 py-2.5">
            <p className="text-sm text-emerald-50 leading-relaxed">
              {message.content}
            </p>
          </div>
          <div className="mt-1 flex justify-end">
            <span className="font-mono text-[10px] text-zinc-600">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start gap-2.5 px-4 py-1">
      <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/50">
        <Bot className="size-3.5 text-emerald-500" />
      </div>
      <div className="max-w-[80%]">
        <div
          className={cn(
            "rounded-2xl rounded-tl-sm px-4 py-2.5 border",
            isTrade
              ? "bg-emerald-950/40 border-emerald-500/30"
              : "bg-zinc-800/60 border-zinc-700/30"
          )}
        >
          {isTrade && (
            <div className="mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span className="font-mono text-xs font-medium text-emerald-400">
                TRADE CONFIRMED
              </span>
            </div>
          )}
          <p
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap",
              isTrade
                ? "font-mono text-emerald-100"
                : "text-zinc-200"
            )}
          >
            {message.content}
          </p>
          {message.tradeId && (
            <div className="mt-2 flex items-center gap-1.5 border-t border-zinc-700/30 pt-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] h-5"
              >
                TX {message.tradeId.slice(0, 8)}...
              </Badge>
            </div>
          )}
        </div>
        <div className="mt-1 flex justify-start">
          <span className="font-mono text-[10px] text-zinc-600">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: "Show prices", icon: BarChart3 },
  { label: "My portfolio", icon: Wallet },
  { label: "Help", icon: HelpCircle },
] as const

export function ChatPanel({
  messages,
  onSendMessage,
  isProcessing,
  isSessionActive,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change or when processing starts
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      "[data-slot='scroll-area-viewport']"
    )
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages, isProcessing])

  // Focus input when session becomes active
  useEffect(() => {
    if (isSessionActive) {
      inputRef.current?.focus()
    }
  }, [isSessionActive])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isProcessing) return
    onSendMessage(trimmed)
    setInput("")
  }

  function handleQuickAction(label: string) {
    if (isProcessing) return
    onSendMessage(label)
  }

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden border-zinc-800 bg-zinc-950 py-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <Terminal className="size-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 leading-none">
              FlowDesk
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 font-mono">
              AI Trading Copilot
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px] h-5",
            isSessionActive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-zinc-700 bg-zinc-800/50 text-zinc-500"
          )}
        >
          <span
            className={cn(
              "mr-1 inline-block size-1.5 rounded-full",
              isSessionActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            )}
          />
          {isSessionActive ? "LIVE" : "OFFLINE"}
        </Badge>
      </div>

      {/* Session inactive banner */}
      {!isSessionActive && (
        <div className="flex items-center justify-center gap-2 border-b border-zinc-800/50 bg-zinc-900/50 px-4 py-2">
          <AlertCircle className="size-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            Open a session to start trading
          </span>
        </div>
      )}

      {/* Messages area */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="flex flex-col gap-1 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-4">
                  <Terminal className="size-6 text-emerald-500/60" />
                </div>
                <p className="text-sm font-medium text-zinc-400">
                  No messages yet
                </p>
                <p className="mt-1 max-w-[240px] text-xs text-zinc-600">
                  {isSessionActive
                    ? "Type a command to begin trading. Try \"Show prices\" or \"Buy $50 of ETH\"."
                    : "Try \"Help\" or \"Show prices\" to get started. Open a session to trade."}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isProcessing && (
              <div className="flex items-start gap-2.5 px-4 py-1">
                <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/50">
                  <Bot className="size-3.5 text-emerald-500 animate-pulse" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-zinc-800/60 border border-zinc-700/30 px-3 py-1.5">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Bottom input area */}
      <div className="border-t border-zinc-800 bg-zinc-900/30">
        {/* Quick actions */}
        <div className="flex gap-1.5 px-3 pt-2.5 pb-1">
          {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              size="xs"
              className={cn(
                "h-6 gap-1 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 text-[11px] font-normal text-zinc-400",
                "hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400",
                "transition-colors",
                isProcessing && "pointer-events-none opacity-40"
              )}
              onClick={() => handleQuickAction(label)}
              disabled={isProcessing}
            >
              <Icon className="size-3" />
              {label}
            </Button>
          ))}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 pb-3 pt-1.5">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isSessionActive
                  ? "Ask me to trade... e.g. 'Buy $50 of ETH'"
                  : "Ask me anything... e.g. 'Show prices' or 'Help'"
              }
              disabled={isProcessing}
              className={cn(
                "h-10 rounded-xl border-zinc-800 bg-zinc-900/80 pl-4 pr-12 text-sm text-zinc-100",
                "placeholder:text-zinc-600",
                "focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20",
                "disabled:opacity-40"
              )}
              autoComplete="off"
              spellCheck={false}
            />
            {isProcessing && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <Loader2 className="size-4 animate-spin text-emerald-500/50" />
              </div>
            )}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isProcessing}
            className={cn(
              "size-10 shrink-0 rounded-xl",
              "bg-emerald-600 text-white hover:bg-emerald-500",
              "disabled:bg-zinc-800 disabled:text-zinc-600",
              "transition-colors"
            )}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

export default ChatPanel
