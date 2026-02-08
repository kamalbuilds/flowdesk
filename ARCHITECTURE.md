# FlowDesk -- System Architecture

Technical architecture document for FlowDesk, an AI-powered DeFi trading
copilot built on Yellow Network state channels with cross-chain deposits
via LI.FI and portable identity through ENS.

---

## System Overview

FlowDesk is a Next.js 15 application that connects a browser-based client
to five external systems over distinct transport protocols:

```
+------------------+
|    Browser UI    |
|  (React + wagmi) |
+--------+---------+
         |
         v
+--------+---------+
|   Next.js App    |
| (App Router/SSR) |
+--+--+--+--+--+--+
   |  |  |  |  |
   |  |  |  |  +---> ENS Mainnet (chainId 1)
   |  |  |  |        Reverse resolution + text records
   |  |  |  |        Transport: JSON-RPC via wagmi/viem
   |  |  |  |
   |  |  |  +-------> OpenRouter API (openrouter.ai)
   |  |  |            Model: google/gemini-2.0-flash-001
   |  |  |            Transport: HTTPS REST
   |  |  |
   |  |  +----------> Pyth Hermes Oracle (hermes.pyth.network)
   |  |               Price feeds: ETH, WBTC, USDC
   |  |               Transport: HTTPS REST (server-side, 10s revalidation)
   |  |
   |  +-------------> LI.FI Aggregator (li.quest/v1)
   |                   Cross-chain bridging quotes + execution
   |                   Transport: HTTPS REST (client-side)
   |
   +----------------> Yellow ClearNode (clearnet-sandbox.yellow.com)
                       State channel lifecycle + off-chain transfers
                       Transport: WebSocket (persistent, authenticated)
```

All external calls originate from the client except Pyth price fetches,
which execute server-side in a Next.js API route with ISR caching.

---

## Component Architecture

The UI is a single-page layout with a two-panel design: a full-height chat
panel on the left and a tabbed control sidebar on the right.

```
page.tsx (Home)
|
+-- <header>
|     +-- ConnectButton (RainbowKit)
|
+-- [Left Panel]
|     +-- ChatPanel
|           +-- MessageBubble (per message)
|           +-- TypingIndicator
|           +-- Quick action buttons (prices, portfolio, help)
|           +-- Text input + send
|
+-- [Right Panel, 380px]
|     +-- ENSProfile (identity card: avatar, name, address)
|     +-- <Tabs>
|           +-- "Session" tab
|           |     +-- SessionManager (idle/connecting/active/settling/closed)
|           |     +-- BalancePanel (token balances + PnL)
|           +-- "Deposit" tab
|           |     +-- CrossChainDeposit (LI.FI bridge wizard)
|           +-- "Trades" tab
|           |     +-- TradeHistory (executed trades list)
|           +-- "Settings" tab
|                 +-- ENSSettings (preference display)
|
+-- <footer>
```

Provider tree (layout.tsx):

```
<html>
  <body>
    <WalletProvider>                      -- wagmi + RainbowKit + react-query
      <WagmiProvider config={config}>
        <QueryClientProvider>
          <RainbowKitProvider>
            {children}                    -- page.tsx
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </WalletProvider>
  </body>
</html>
```

---

## File Map

```
app/src/
+-- app/
|   +-- layout.tsx                  Root layout, WalletProvider wrapper
|   +-- page.tsx                    Main page, two-panel layout
|   +-- api/
|       +-- chat/route.ts           POST /api/chat  -> OpenRouter proxy
|       +-- prices/route.ts         GET  /api/prices -> Pyth Hermes fetch
|
+-- components/
|   +-- deposit/
|   |   +-- CrossChainDeposit.tsx   LI.FI bridge wizard (4-step flow)
|   +-- ens/
|   |   +-- ENSProfile.tsx          Identity card display
|   |   +-- ENSSettings.tsx         Preference viewer
|   +-- providers/
|   |   +-- WalletProvider.tsx      wagmi + RainbowKit + QueryClient
|   +-- trading/
|   |   +-- BalancePanel.tsx        Portfolio balances + PnL
|   |   +-- ChatPanel.tsx           AI copilot chat interface
|   |   +-- SessionManager.tsx      Channel lifecycle UI (state machine)
|   |   +-- TradeHistory.tsx        Executed trades list
|   +-- ui/                         shadcn/ui primitives
|
+-- hooks/
|   +-- useCrossChainDeposit.ts     LI.FI quote + execute state machine
|   +-- useENSProfile.ts           ENS name/avatar/text record reads
|   +-- usePrices.ts               Client-side price polling (30s interval)
|   +-- useTradingEngine.ts        Orchestrator: AI + Yellow + prices
|   +-- useYellowSession.ts        React binding for YellowClient singleton
|
+-- lib/
|   +-- ai/
|   |   +-- engine.ts              AI response parser + local trade parser
|   |   +-- prompts.ts             System prompt builder
|   +-- ens/
|   |   +-- keys.ts                ENS record parser + serializer
|   +-- lifi/
|   |   +-- config.ts              LI.FI SDK initialization
|   +-- prices/
|   |   +-- feed.ts                Pyth Hermes fetch + price math
|   +-- yellow/
|   |   +-- client.ts              YellowClient class (singleton)
|   +-- constants.ts               Chains, tokens, addresses, config
|   +-- utils.ts                   Tailwind cn() helper
|   +-- wagmi-config.ts            Chain list + RainbowKit config
|
+-- types/
    +-- index.ts                   All shared TypeScript interfaces
```

---

## Yellow Network Integration

### Protocol: Nitrolite State Channels via @erc7824/nitrolite

The YellowClient class (`lib/yellow/client.ts`) is a singleton that manages
the full WebSocket lifecycle with the Yellow ClearNode. Every RPC message
is constructed by the nitrolite SDK and sent as a JSON string over
a persistent WebSocket connection.

### Authentication Flow

```
  Browser (FlowDesk)                          ClearNode (Yellow)
  ==================                          ==================

  1. generatePrivateKey()
     -> sessionKey (ephemeral)
     -> sessionKeyAddress

  2. new WebSocket(wss://clearnet-sandbox.yellow.com/ws)
     -------------------------------------------------->
                                               onopen

  3. createAuthRequestMessage({
       address: walletAddress,
       session_key: sessionKeyAddress,
       application: 'FlowDesk',
       expires_at: now + 3600,
       scope: 'console',
       allowances: [
         { asset: 'ytest.usd', amount: '1000000000' },
         { asset: 'eth', amount: '10000000000000000000' }
       ]
     })
     ----- auth_request ------------------------------>

  4.                                           Validates request
                                               Generates UUID challenge
     <---- auth_challenge (UUID) -------------------

  5. createEIP712AuthMessageSigner(
       walletClient,          <-- user's wallet signs EIP-712 typed data
       { scope, session_key, expires_at, allowances },
       { name: 'FlowDesk' }
     )

     createAuthVerifyMessage(eip712Signer, challengeResponse)
     ----- auth_verify -------------------------------->

  6.                                           Verifies EIP-712 signature
                                               Issues JWT + session binding
     <---- auth_verify (success: true, jwtToken) ---

  7. startPing() -- 30s interval heartbeat via createPingMessageV2()
```

### Channel Lifecycle

```
  State: idle --> connecting --> active --> settling --> closed

  OPEN SESSION:
  +--------------------------------------------------------------+
  | 1. POST /faucet/requestTokens (sandbox only)                 |
  | 2. createCreateChannelMessage(signer, {                      |
  |      chain_id: 84532,       // Base Sepolia                  |
  |      token: '0xDB9F...DEb'  // ytest.usd sandbox token       |
  |    })                                                        |
  |    --> ClearNode processes, returns channelId + participants |
  | 3. createGetLedgerBalancesMessage(signer)                    |
  |    --> Fetches unified balance from ClearNode                |
  | 4. Session status = 'active', local balance initialized      |
  +--------------------------------------------------------------+

  EXECUTE TRADE:
  +--------------------------------------------------------------+
  | 1. Validate balance locally (sufficient tokenIn?)            |
  | 2. Calculate amountOut using Pyth prices                     |
  | 3. createTransferMessage(signer, {                           |
  |      destination: clearNodeAddress,                          |
  |      allocations: [{ asset: 'ytest.usd', amount }]           |
  |    })                                                        |
  |    --> Off-chain transfer, debit unified balance             |
  | 4. Update local balance state                                |
  | 5. Recalculate PnL against initial deposit                   |
  +--------------------------------------------------------------+

  CLOSE SESSION:
  +--------------------------------------------------------------+
  | 1. Session status = 'settling'                               |
  | 2. createCloseChannelMessage(signer, channelId, walletAddr)  |
  |    --> On-chain settlement finalized by ClearNode            |
  | 3. Session status = 'closed'                                 |
  +--------------------------------------------------------------+
```

### WebSocket Message Routing

The `handleMessage` method dispatches on `response.method`:

```
  Incoming Method            Action
  -----------------------    -----------------------------------------
  RPCMethod.AuthChallenge    Sign EIP-712, send auth_verify
  RPCMethod.AuthVerify       Store JWT, mark authenticated
  RPCMethod.Error            Reject pending request or fail auth
  RPCMethod.CreateChannel    Resolve pending openSession promise
  RPCMethod.CloseChannel     Resolve pending closeSession promise
  RPCMethod.Transfer         Resolve pending executeTrade promise
  RPCMethod.GetLedgerBalances  Resolve pending balance query
  RPCMethod.BalanceUpdate    Log notification (balance changed)
  RPCMethod.ChannelUpdate    Log notification (channel state changed)
  RPCMethod.TransferNotification  Log notification (transfer event)
  RPCMethod.Pong             Heartbeat ack (no-op)
```

### Pending Request Pattern

Every outgoing RPC that expects a response uses a `requestId` (from
`generateRequestId()`) stored in a `Map<number, { resolve, reject }>`.
When the response arrives, the matching entry is resolved and removed.
All pending requests have a 15-second timeout.

### Key Files

| File | Purpose |
|------|---------|
| `app/src/lib/yellow/client.ts` | YellowClient class -- singleton, WebSocket lifecycle, auth, channels, trades |
| `app/src/hooks/useYellowSession.ts` | React hook binding -- subscribes to YellowClient state, exposes openSession/executeTrade/closeSession |
| `app/src/lib/constants.ts` | YELLOW_CONFIG (WS URL, chain ID, adjudicator), NITROLITE_CHAINS (custody contracts) |

---

## State Management

There is no external state library (no Redux, Zustand, or Jotai). State
flows through a combination of a singleton class with pub/sub and React
hooks with `useState`/`useCallback`.

### State Architecture

```
  +-------------------+
  |   YellowClient    |  (singleton, created once via getYellowClient())
  |-------------------|
  | - ws: WebSocket   |
  | - session: {...}  |  <-- authoritative session state
  | - listeners: Set  |
  | - pendingRequests |
  | - sessionKey      |
  | - jwtToken        |
  +--------+----------+
           |
           | subscribe(listener) -- pushes immutable copies
           |
  +--------v----------+
  | useYellowSession  |  (React hook)
  |-------------------|
  | - session state   |  <-- React state, updated via subscription
  | - openSession()   |
  | - executeTrade()  |
  | - closeSession()  |
  +--------+----------+
           |
  +--------v----------+
  | useTradingEngine  |  (orchestrator hook)
  |-------------------|
  | - session         |  from useYellowSession
  | - messages[]      |  chat message history
  | - prices          |  from usePrices (30s poll)
  | - preferences     |  from useENSProfile (ENS text records)
  | - sendMessage()   |  AI parse -> validate -> execute pipeline
  +--------+----------+
           |
  +--------v----------+
  |     page.tsx      |  (top-level component)
  |-------------------|
  |  Distributes state to all child components
  +-------------------+
```

### Session State Machine

```
  idle -----> connecting -----> active -----> settling -----> closed
   ^                              |                             |
   |                              |  (trades execute here)      |
   |                              |                             |
   +------------------------------------------------------------+
                          (new session)
```

| State | Description |
|-------|-------------|
| `idle` | No session. User sees "Start Trading Session" form. |
| `connecting` | WebSocket connecting + authenticating + creating channel. |
| `active` | Channel open. Trades execute off-chain. Ping heartbeat running. |
| `settling` | closeChannelMessage sent. Awaiting on-chain finalization. |
| `closed` | Settlement complete. User can start a new session. |

---

## LI.FI Cross-Chain Deposit Flow

The deposit flow is a 4-step wizard managed by `useCrossChainDeposit` and
rendered by the `CrossChainDeposit` component.

### Supported Source Chains

| Chain | ID | Role |
|-------|----|------|
| Ethereum | 1 | Source |
| Polygon | 137 | Source |
| Arbitrum | 42161 | Source |
| Optimism | 10 | Source |
| Base | 8453 | **Target** (deposit destination) |

### Flow Diagram

```
  Step 1: Select Source Chain
  +---------------------------------+
  | User picks: Ethereum / Polygon  |
  | / Arbitrum / Optimism           |
  +--------------+------------------+
                 |
                 v
  Step 2: Select Token + Amount
  +---------------------------------+
  | Token: USDC / ETH / WBTC       |
  | Amount: numeric input           |
  +--------------+------------------+
                 |
                 v
  Step 3: LI.FI Quote
  +---------------------------------+
  | GET li.quest/v1/quote           |
  |   ?fromChain={sourceChainId}    |
  |   &toChain=8453                 |
  |   &fromToken={tokenAddress}     |
  |   &toToken=0x8335...(USDC/Base) |
  |   &fromAmount={parsed}          |
  |   &fromAddress={wallet}         |
  |                                 |
  | Display: route, gas cost, ETA,  |
  |   estimated output amount       |
  +--------------+------------------+
                 |  user confirms
                 v
  Step 4: Execute Bridge
  +---------------------------------+
  | Extract transactionRequest from |
  | LI.FI quote response            |
  |                                 |
  | sendTransactionAsync({          |
  |   to: tx.to,                    |
  |   data: tx.data,                |
  |   value: tx.value               |
  | })                              |
  |                                 |
  | Progress: approving -> bridging |
  |   -> depositing -> done         |
  +--------------+------------------+
                 |
                 v
  Funds arrive as USDC on Base
  onDepositComplete(amount) triggers session open
```

### Deposit State Machine

```
  idle --> quoting --> idle (quote received)
                        |
                        v
                    approving --> bridging --> depositing --> done
                        |                                     |
                        +----------> error <------------------+
```

---

## ENS Identity Layer

ENS provides a portable, on-chain identity for FlowDesk users. All ENS
reads target Ethereum mainnet (chainId: 1).

### Resolution Chain

```
  useAccount()
    |
    +--> useEnsName({ address, chainId: 1 })
    |      |
    |      +--> normalize(ensName)        -- viem/ens UTS-46 normalization
    |             |
    |             +--> useEnsAvatar({ name, chainId: 1 })
    |             |
    |             +--> useEnsText({ name, key: 'com.flowdesk.slippage' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.risk-level' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.favorite-pairs' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.max-trade-size' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.take-profit' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.stop-loss' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.preferred-chain' })
    |             +--> useEnsText({ name, key: 'com.flowdesk.session-budget' })
    |
    v
  DeFiPreferences object (with defaults for missing keys)
```

### ENS Text Record Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `com.flowdesk.slippage` | float | 0.5 | Max slippage tolerance (%) |
| `com.flowdesk.risk-level` | enum | `moderate` | `conservative` / `moderate` / `aggressive` |
| `com.flowdesk.favorite-pairs` | CSV | `ETH/USDC,WBTC/USDC` | Preferred trading pairs |
| `com.flowdesk.max-trade-size` | int | 1000 | Max single trade value (USD) |
| `com.flowdesk.take-profit` | float | 5 | Take profit target (%) |
| `com.flowdesk.stop-loss` | float | 3 | Stop loss limit (%) |
| `com.flowdesk.preferred-chain` | int | 84532 | Preferred chain ID |
| `com.flowdesk.session-budget` | float | 500 | Session deposit budget (USD) |

### How Preferences Affect Trading

The AI system prompt (`lib/ai/prompts.ts`) includes all preferences
verbatim. The `validateTrade` function in `lib/ai/engine.ts` enforces
`maxTradeSize` before any trade executes:

```
  User: "Buy $2000 of ETH"
    --> AI parses intent: buy ETH, amount=2000 USDC
    --> validateTrade() checks: 2000 > maxTradeSize (1000)
    --> Returns error: "Trade value exceeds your max trade size"
```

---

## Price Oracle (Pyth Network)

### Architecture

```
  Client (usePrices hook)        Next.js Server           Pyth Hermes
  =======================        ==============           ===========

  fetch('/api/prices')  -------> GET handler
    every 30s                      |
                                   +--> fetchPrices()
                                   |      |
                                   |      +--> GET hermes.pyth.network
                                   |      |      /v2/updates/price/latest
                                   |      |      ?ids[]=0xff61...(ETH)
                                   |      |      &ids[]=0xe62d...(WBTC)
                                   |      |      &ids[]=0xeaa0...(USDC)
                                   |      |
                                   |      |    next: { revalidate: 10 }
                                   |      |    (ISR: re-fetches every 10s)
                                   |      |
                                   |      +--> Parse response:
                                   |             price = rawPrice * 10^expo
                                   |             WETH mirrors ETH price
                                   |
                                   v
                              NextResponse.json(prices)
  <--- PriceData ----------------
```

### Pyth Feed IDs

| Symbol | Feed ID |
|--------|---------|
| ETH | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| WBTC | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| USDC | `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a` |

### Price Calculation

```
  rawPrice = Number(feed.price.price)     // e.g. 320045000000
  expo     = feed.price.expo              // e.g. -8
  usdPrice = rawPrice * 10^expo           // e.g. 3200.45
```

The 24h change is estimated by comparing the current price to the
previously cached price. Pyth does not provide historical change data
through this endpoint.

### Caching Strategy

- **Server-side**: `next: { revalidate: 10 }` -- ISR caches the Pyth
  response for 10 seconds before re-fetching.
- **Client-side**: `usePrices` polls `/api/prices` every 30 seconds.
  Default/fallback prices are provided for ETH ($3200), WBTC ($97000),
  USDC ($1) in case the API is unreachable.

---

## AI Copilot

### Dual-Mode Architecture

The AI subsystem has two execution paths: a remote LLM and a local
regex-based parser. The local parser acts as a zero-latency fallback.

```
  User Input
      |
      v
  +-- Try Remote AI --------------------------+
  |                                            |
  |  POST /api/chat                            |
  |    {                                       |
  |      messages: [{ role: 'user', ... }],    |
  |      systemPrompt: getSystemPrompt(...)    |
  |    }                                       |
  |                                            |
  |  /api/chat/route.ts:                       |
  |    if (!OPENROUTER_API_KEY)                |
  |      return { useLocal: true }             |
  |                                            |
  |    POST openrouter.ai/api/v1/chat/...      |
  |      model: google/gemini-2.0-flash-001    |
  |      temperature: 0.3                      |
  |      max_tokens: 500                       |
  |                                            |
  |    return { content: "..." }               |
  +--------------------------------------------+
      |
      | (if API unavailable or returns useLocal)
      v
  +-- Local Parser (fallback) ----------------+
  |                                            |
  |  localTradeParser(input, balance, prices)  |
  |                                            |
  |  Regex patterns:                           |
  |    /buy\s+\$?(\d+)\s+(?:of\s+)?(\w+)/     |
  |    /sell\s+\$?(\d+)\s+(?:of\s+)?(\w+)/    |
  |    /swap\s+(\d+)\s+(\w+)\s+(?:for)\s+.../ |
  |    keywords: portfolio, balance, holdings  |
  |    keywords: price, how much              |
  |    keywords: help, hi, hello              |
  +--------------------------------------------+
      |
      v
  AIResponse { message: string, trade?: TradeAction }
      |
      +-- Has trade action?
      |     |
      |     +--> validateTrade(trade, preferences, balance, prices)
      |     |      |
      |     |      +--> Check: tradeValueUsd <= maxTradeSize
      |     |      +--> Check: balance[tokenIn] >= amount
      |     |      |
      |     |      +--> (error string) --> addMessage('assistant', error)
      |     |      +--> (null = valid) --> executeTrade()
      |     |
      |     +--> YellowClient.executeTrade(type, tokenIn, tokenOut, amount, prices)
      |            |
      |            +--> createTransferMessage --> ClearNode
      |            +--> Update local balance
      |            +--> Calculate PnL
      |            +--> Return Trade object
      |
      +-- No trade action?
            +--> addMessage('assistant', response.message)
```

### System Prompt Construction

The system prompt (`lib/ai/prompts.ts`) is dynamically built with:

1. **Current balance** -- all non-zero token holdings
2. **Live prices** -- from Pyth, with 24h change
3. **ENS preferences** -- risk level, max trade size, slippage, TP/SL,
   favorite pairs
4. **Rules** -- structured JSON output format for trade execution,
   validation against preferences, risk flagging

### Supported Commands

| Command Pattern | Action |
|-----------------|--------|
| `buy $X of TOKEN` | Buy TOKEN with USDC |
| `sell X TOKEN` | Sell TOKEN for USDC |
| `swap X TOKEN1 for TOKEN2` | Direct swap |
| `portfolio` / `balance` | Show current holdings |
| `prices` / `how much` | Show current market prices |
| `help` | List available commands |

### Token Normalization

The parser normalizes token names:
- `BTC` / `BITCOIN` --> `WBTC`
- All symbols uppercased

---

## Data Flow: End-to-End Trade Execution

This traces a complete trade from user input to balance update:

```
  1. User types: "Buy $100 of ETH"
     |
  2. useTradingEngine.sendMessage("Buy $100 of ETH")
     |
  3. Build system prompt with current state:
     |  - Balance: 500 USDC
     |  - ETH price: $3200
     |  - Max trade size: $1000
     |  - Risk level: moderate
     |
  4. POST /api/chat (or fallback to localTradeParser)
     |
  5. Parse response --> TradeAction:
     |  { action: 'trade', type: 'buy',
     |    tokenIn: 'USDC', tokenOut: 'ETH', amount: 100 }
     |
  6. validateTrade():
     |  - $100 <= $1000 max trade size? YES
     |  - 500 USDC >= 100 USDC needed? YES
     |  - Returns null (valid)
     |
  7. YellowClient.executeTrade('buy', 'USDC', 'ETH', 100, prices):
     |
     |  a. Calculate: amountOut = (100 * 1) / 3200 = 0.03125 ETH
     |
     |  b. createTransferMessage(signer, {
     |       destination: clearNodeAddress,
     |       allocations: [{ asset: 'ytest.usd', amount: '100' }]
     |     })
     |     ---> WebSocket ---> ClearNode
     |     <--- Transfer confirmed (off-chain, zero gas)
     |
     |  c. Update local balance:
     |       USDC: 500 - 100 = 400
     |       ETH:  0 + 0.03125 = 0.03125
     |
     |  d. Recalculate PnL:
     |       totalValue = 400 * 1 + 0.03125 * 3200 = $500
     |       pnl = 500 - 500 (initial deposit) = $0
     |
  8. Trade object returned:
     |  { id: 'trade-...', type: 'buy', tokenIn: 'USDC',
     |    tokenOut: 'ETH', amountIn: '100', amountOut: '0.03125000',
     |    price: 3200, status: 'executed' }
     |
  9. Assistant message displayed:
     |  "Trade executed instantly via Yellow state channel (zero gas):
     |   - BUY: 100 USDC -> 0.031250 ETH
     |   - Price: $3,200
     |   - Status: Confirmed off-chain"
     |
  10. UI updates:
      - ChatPanel: new message bubble (trade confirmation style)
      - BalancePanel: updated token amounts and PnL
      - TradeHistory: new entry appended
      - SessionManager: trade count incremented
```

---

## Network Configuration

### Wagmi Chain Configuration

```
  Mainnets (Yellow production):
    - Ethereum (1)
    - Base (8453)
    - Polygon (137)

  Testnets (Yellow sandbox):
    - Sepolia (11155111)
    - Base Sepolia (84532)     <-- DEFAULT_CHAIN_ID
    - Polygon Amoy (80002)
    - Linea Sepolia (59141)

  L2s (LI.FI cross-chain sources):
    - Arbitrum (42161)
    - Optimism (10)
```

### Nitrolite Custody Contract Addresses

| Network | Chain ID | Custody Contract |
|---------|----------|-----------------|
| Mainnet | 1 | `0x6F71a38d919ad713D0AfE0eB712b95064Fc2616f` |
| Base | 8453 | `0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6` |
| Polygon | 137 | `0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6` |
| Sepolia | 11155111 | `0x019B65A265EB3363822f2752141b3dF16131b262` |
| Base Sepolia | 84532 | `0x019B65A265EB3363822f2752141b3dF16131b262` |
| Polygon Amoy | 80002 | `0x019B65A265EB3363822f2752141b3dF16131b262` |
| Linea Sepolia | 59141 | `0x019B65A265EB3363822f2752141b3dF16131b262` |

### Yellow ClearNode

| Key | Value |
|-----|-------|
| Sandbox WS | `wss://clearnet-sandbox.yellow.com/ws` |
| Production WS | `wss://clearnet.yellow.com/ws` |
| Sandbox Faucet | `https://clearnet-sandbox.yellow.com/faucet/requestTokens` |
| Sandbox Token (ytest.usd) | `0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb` |
| Adjudicator | `0x7c7ccbc98469190849BCC6c926307794fDfB11F2` |
| Default Chain | Base Sepolia (84532) |
| Auth Scope | `console` |
| Challenge Duration | 3600 seconds |

---

## Type System

All shared types are defined in `types/index.ts`:

```
  ENSProfile {
    name: string | null
    avatar: string | null
    address: `0x${string}`
    preferences: DeFiPreferences
  }

  DeFiPreferences {
    slippage: number
    riskLevel: 'conservative' | 'moderate' | 'aggressive'
    favoritePairs: string[]
    maxTradeSize: number
    takeProfit: number
    stopLoss: number
    preferredChain: number
    sessionBudget: number
  }

  TradingSession {
    id: string
    channelId: string | null
    status: 'idle' | 'connecting' | 'active' | 'settling' | 'closed'
    balance: SessionBalance
    trades: Trade[]
    pnl: number
    startTime: number | null
  }

  SessionBalance {
    usdc: number
    eth: number
    wbtc: number
    [token: string]: number      // extensible
  }

  Trade {
    id: string
    type: 'buy' | 'sell'
    tokenIn: string
    tokenOut: string
    amountIn: string
    amountOut: string
    price: number
    timestamp: number
    status: 'pending' | 'executed' | 'failed'
  }

  ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
    tradeId?: string
  }

  DepositState {
    status: 'idle' | 'quoting' | 'approving' | 'bridging'
            | 'depositing' | 'done' | 'error'
    sourceChain: number | null
    sourceToken: string | null
    amount: string
    quote: any | null
    txHash: string | null
    error: string | null
  }

  PriceData {
    [symbol: string]: {
      usd: number
      usd_24h_change: number
    }
  }
```

---

## Dependencies

### Core Framework
- **Next.js 15** -- App Router, server-side API routes, ISR
- **React 19** -- Client components with `'use client'` directive
- **TypeScript** -- Strict typing throughout

### Wallet / Web3
- **wagmi** -- React hooks for Ethereum (useAccount, useEnsName, etc.)
- **viem** -- Low-level Ethereum utilities (accounts, ENS, types)
- **@rainbow-me/rainbowkit** -- Wallet connect UI + config
- **@tanstack/react-query** -- Async state for wagmi hooks

### Yellow Network
- **@erc7824/nitrolite** -- Nitrolite state channel SDK (RPC message
  builders, EIP-712 signers, message parsers)

### Cross-Chain
- **@lifi/sdk** -- LI.FI bridge SDK (initialized but quote/execute done
  via REST API directly)

### UI
- **tailwindcss** -- Utility-first CSS
- **shadcn/ui** -- Component primitives (Card, Button, Input, Badge, etc.)
- **lucide-react** -- Icon library
- **class-variance-authority + tailwind-merge** -- via cn() utility
