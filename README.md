# FlowDesk -- AI Trading Copilot

[![ETHGlobal HackMoney 2026](https://img.shields.io/badge/ETHGlobal-HackMoney%202026-6F3FF5?style=flat-square)](https://ethglobal.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Yellow Network](https://img.shields.io/badge/Yellow%20Network-Nitrolite-FFD700?style=flat-square)](https://yellow.com/)
[![LI.FI](https://img.shields.io/badge/LI.FI-Cross--Chain-7B3FE4?style=flat-square)](https://li.fi/)
[![ENS](https://img.shields.io/badge/ENS-Identity-5298FF?style=flat-square)](https://ens.domains/)

> AI trading copilot: instant off-chain trades via Yellow state channels, LI.FI deposits, ENS identity

**FlowDesk** is an AI-powered DeFi trading assistant that combines instant off-chain execution (Yellow state channels), cross-chain liquidity (LI.FI), and portable DeFi identity (ENS) into a unified trading terminal. Users interact with a conversational AI copilot that reads their on-chain preferences, accepts deposits from any chain, and executes trades instantly through state channels settling on-chain only when the session ends.

2. Problem Statement

### The DeFi Trading Experience is Broken

1. **Gas costs kill micro-trading**: Every swap costs $0.50-$5+ in gas. Day traders making 20+ trades/day lose $10-100+ to gas alone.
2. **Speed kills alpha**: On-chain transactions take 2-15 seconds. By then, the opportunity is gone.
3. **Cross-chain friction**: Your USDC is on Arbitrum but the best yield is on Optimism. Bridging takes minutes and costs gas.
4. **Settings don't travel**: Every DeFi app makes you re-configure slippage, deadlines, and preferences. Nothing is portable.
5. **Complexity barrier**: New users are overwhelmed by chains, tokens, pools, and parameters.

### FlowDesk's Solution

Open a trading session. Tell the AI what you want. It executes instantly off-chain, settles when you're done. Your preferences follow you via ENS. Your funds come from any chain via LI.FI.

---

## Technology

| Technology | Sponsor | Details |
|-------|---------|---------|
| State Channels | Yellow Network | Full Nitrolite SDK integration -- WebSocket auth, channel lifecycle, instant transfers |
| Cross-Chain Deposits | LI.FI | REST API quote + execution for multi-chain deposits to Base |
| Portable DeFi Identity | ENS | Custom `com.flowdesk.*` text record schema for trading preferences |

---

## Features

### 1. Yellow Network / Nitrolite -- Instant Off-Chain Trading

The deepest integration in the project. A full Nitrolite RPC client (`app/src/lib/yellow/client.ts`) implements the complete state channel lifecycle:

- **Session Key Architecture** -- One EIP-712 wallet signature during authentication, then an ephemeral session key (generated via `generatePrivateKey()` from viem) signs all subsequent trades. Zero wallet popups during active trading.
- **3-Step Authentication Flow** -- `createAuthRequestMessage()` sends credentials, receives `auth_challenge`, signs EIP-712 typed data with `createEIP712AuthMessageSigner()`, completes via `createAuthVerifyMessage()` to receive a JWT.
- **State Channel Operations** -- `createCreateChannelMessage()` opens channels on Base Sepolia (chain 84532), `createTransferMessage()` executes instant off-chain trades, `createGetLedgerBalancesMessage()` queries balances, `createCloseChannelMessage()` settles on-chain.
- **WebSocket Management** -- Persistent connection to `wss://clearnet-sandbox.yellow.com/ws` with heartbeat ping/pong, automatic reconnection, and 15-second request timeouts.
- **Faucet Integration** -- Auto-requests `ytest.usd` tokens from the ClearNode sandbox on session open.
- **Verified E2E** -- Full lifecycle tested on ClearNode sandbox: faucet tokens received, JWT issued, channel created, 5 ytest.usd transfer executed (txId: 35437), balance correctly debited.

### 2. LI.FI -- Cross-Chain Deposits

Deposits from any supported chain into the Yellow-funded trading session:

- **Quote API** -- Calls `li.quest/v1/quote` with source chain, token, amount, and destination parameters to find optimal cross-chain routes.
- **Wallet Execution** -- Executes the bridge+swap transaction directly through the connected wallet.
- **Status Tracking** -- State machine: `idle` -> `quoting` -> `bridging` -> `done`.
- **Supported Chains** -- Ethereum, Polygon, Arbitrum, Optimism as source chains, routing to USDC on Base.

### 3. ENS -- Portable DeFi Identity

A custom ENS text record schema that turns an ENS name into a portable trading profile:

```
com.flowdesk.slippage         "0.5"                     Slippage tolerance %
com.flowdesk.risk-level       "moderate"                 conservative | moderate | aggressive
com.flowdesk.favorite-pairs   "ETH/USDC,WBTC/USDC"      Preferred trading pairs
com.flowdesk.max-trade-size   "1000"                     Max single trade in USDC
com.flowdesk.take-profit      "5"                        Auto take-profit target %
com.flowdesk.stop-loss        "3"                        Auto stop-loss target %
com.flowdesk.preferred-chain  "84532"                    Default chain ID
com.flowdesk.session-budget   "500"                      Default session funding
```

Uses wagmi's `useEnsName()` for reverse resolution, `useEnsAvatar()` for profile images, and 8 individual `useEnsText()` calls against mainnet ENS. The AI copilot reads these preferences to validate trades against the user's on-chain risk profile.

### 4. AI Copilot -- Natural Language Trading

Talk to your trading terminal:

- **"Buy $50 of ETH"** -- Parsed, validated against ENS risk profile, executed via state channel.
- **"Show my portfolio"** -- Displays current balances with real-time PnL.
- **Dual Engine** -- OpenRouter API (Gemini 2.0 Flash) for natural language understanding + local regex-based parser as offline fallback.
- **Risk Validation** -- Every trade checked against `max-trade-size`, `risk-level`, and `stop-loss` from ENS records.

### 5. Pyth Oracle -- Real-Time Prices

Live price feeds via Pyth Hermes API with 10-second revalidation. Powers PnL calculations: `PnL = currentPortfolioValue - initialDeposit`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Wallet | wagmi v3, viem, RainbowKit |
| State Channels | @erc7824/nitrolite (Yellow Network SDK) |
| Cross-Chain | LI.FI REST API |
| Identity | ENS via wagmi hooks |
| AI | OpenRouter API (Gemini 2.0 Flash) + local regex parser |
| Prices | Pyth Hermes oracle |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A wallet with Base Sepolia testnet access (chain 84532)
- (Optional) An [OpenRouter](https://openrouter.ai/) API key for the AI copilot

### Installation

```bash
cd app
npm install
```

### Environment

Create `app/.env.local`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

The AI copilot works without this key (falls back to the local regex parser), but natural language understanding improves significantly with it.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet on **Base Sepolia** (chain 84532), and the app will:

1. Resolve your ENS name and load trading preferences from mainnet
2. Auto-request faucet tokens from the ClearNode sandbox
3. Authenticate via EIP-712 and open a state channel session
4. Accept natural language trading commands through the AI copilot

---

## Testing Yellow Network E2E

A standalone test script exercises the full Nitrolite lifecycle without the browser:

```bash
node app/test-yellow.mjs
```

This runs: faucet request -> WebSocket connect -> 3-step auth -> ledger balance check -> channel create -> transfer -> channel close.

---

## Project Structure

```
app/
  src/
    lib/
      yellow/
        client.ts          Nitrolite RPC client -- auth, channels, transfers
      ai/
        engine.ts          AI trade parser (OpenRouter + regex fallback)
        prompts.ts         System prompts with ENS preference injection
      prices/
        feed.ts            Pyth Hermes oracle integration
      lifi/
        config.ts          LI.FI API configuration
        keys.ts            Chain and token address mappings
      ens/                 ENS text record key definitions
      constants.ts         Yellow Network config (endpoints, token addresses)
      wagmi-config.ts      Wallet and chain configuration
    hooks/
      useYellowSession.ts     Session key management + channel lifecycle
      useENSProfile.ts        ENS name, avatar, and text record queries
      useCrossChainDeposit.ts  LI.FI quote + bridge execution
      useTradingEngine.ts      AI copilot + trade execution orchestrator
      usePrices.ts             Pyth price feed hook
    components/
      trading/             Trading terminal UI
      deposit/             Cross-chain deposit flow (LI.FI)
      ens/                 ENS profile display + settings editor
      ui/                  shadcn/ui primitives
      providers/           RainbowKit + wagmi + React Query providers
  test-yellow.mjs          Standalone E2E test for Yellow Network
```

---

## Architecture

```
User Wallet
    |
    v
[EIP-712 Auth] --> Yellow ClearNode (WebSocket)
    |                    |
    |                    v
    |            State Channel (off-chain)
    |              instant trades
    |              session key signing
    |                    |
    v                    v
[ENS Mainnet]    [Pyth Hermes]
  preferences      live prices
    |                    |
    v                    v
[AI Copilot] <-- natural language --> User
    |
    v
[LI.FI API] --> cross-chain deposits
```

---

## How It Works

1. **Connect** -- Wallet connects via RainbowKit. ENS name resolves, trading preferences load from `com.flowdesk.*` text records.
2. **Fund** -- Deposit from any chain via LI.FI, or receive faucet tokens on testnet.
3. **Authenticate** -- Single EIP-712 signature creates session key with spending allowances.
4. **Trade** -- Type natural language commands. AI parses intent, validates against ENS risk profile, executes instantly via state channel.
5. **Settle** -- Close session to settle final balances on-chain through the Nitrolite protocol.

---

## Key Technical Decisions

- **Session keys over repeated signing** -- One wallet signature, then the ephemeral key handles everything. Eliminates popup fatigue during active trading.
- **Dual AI engine** -- Cloud API for quality, local regex for reliability. The app works fully offline with zero external AI dependencies.
- **ENS as config layer** -- Trading preferences stored on-chain are portable across any DeFi protocol that reads `com.flowdesk.*` keys.
- **No mocks** -- Real ClearNode WebSocket, real Pyth prices, real LI.FI quotes. Every integration hits production/sandbox infrastructure.

---

## License

Built for [ETHGlobal HackMoney 2026](https://ethglobal.com/).
