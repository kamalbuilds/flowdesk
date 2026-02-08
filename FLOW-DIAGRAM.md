# FlowDesk - System Flow Diagrams

This document contains ASCII flow diagrams illustrating the key user flows,
system interactions, and state transitions within the FlowDesk application.

---

## 1. High-Level System Architecture

```
+=============================+     +============================+     +============================+
|        Browser / UI         |     |      Next.js Server        |     |       External APIs        |
|                             |     |      (API Routes)          |     |                            |
|  +---------------------+    |     |  +----------------------+  |     |  +----------------------+  |
|  | React 19 + wagmi v3 |    |     |  | POST /api/chat       |  |     |  | Pyth Hermes          |  |
|  | RainbowKit wallet   |    |     |  |   -> OpenRouter AI   |  |     |  | hermes.pyth.network  |  |
|  +---------------------+    |     |  +----------------------+  |     |  | /v2/updates/price/   |  |
|  | TradingTerminal      |   |     |                            |     |  |   latest             |  |
|  |  - ChatPanel         |<--+---->|  +----------------------+  |     |  +----------------------+  |
|  |  - BalancePanel      |   |REST |  | GET /api/prices      |--+---->|                            |
|  |  - TradeHistory      |   |     |  |   -> Pyth Hermes     |  |     |  +----------------------+  |
|  |  - SessionManager    |   |     |  +----------------------+  |     |  | OpenRouter AI        |  |
|  +---------------------+    |     +============================+     |  | openrouter.ai/api/   |  |
|                             |                                        |  |   v1/chat/completions|  |
|  +---------------------+    |                                        |  | model: gemini-2.0-   |  |
|  | ENS Profile          |   |                                        |  |   flash-001          |  |
|  |  - useEnsName        |   |                                        |  +----------------------+  |
|  |  - useEnsAvatar      |   |                                        +============================+
|  |  - useEnsText x8     |   |
|  +---------------------+    |
|                             |
|  +---------------------+    |        +============================+
|  | CrossChainDeposit    |---+------->| LI.FI API                  |
|  |  - Chain selector    |   | REST   | li.quest/v1/quote          |
|  |  - Token + amount    |   |        | - Cross-chain routing      |
|  |  - Quote display     |   |        | - Bridge + swap            |
|  +---------------------+    |        +============================+
+=============================+
        |
        |  WebSocket (wss://)
        v
+=============================+        +============================+
| Yellow ClearNode             |        | ENS (Ethereum Mainnet)     |
| (Sandbox Environment)        |        | chainId: 1                 |
|                              |        |                            |
| wss://clearnet-sandbox.      |        | useEnsName(address)        |
|   yellow.com/ws              |        | useEnsAvatar(name)         |
|                              |        | useEnsText(name, key) x8:  |
| - auth_request / challenge   |        |   com.flowdesk.slippage    |
| - auth_verify (EIP-712)      |        |   com.flowdesk.risk-level  |
| - create_channel             |        |   com.flowdesk.favorite-   |
| - transfer (state updates)   |        |     pairs                  |
| - close_channel              |        |   com.flowdesk.max-trade-  |
| - get_ledger_balances        |        |     size                   |
| - ping / pong                |        |   com.flowdesk.take-profit |
|                              |        |   com.flowdesk.stop-loss   |
| Custody: 0x019B65...262      |        |   com.flowdesk.preferred-  |
| Chain: Base Sepolia (84532)  |        |     chain                  |
+==============================+        |   com.flowdesk.session-    |
                                        |     budget                 |
                                        +============================+
```

---

## 2. Authentication Flow

```
    +----------+           +------------------+           +------------------+
    |  Wallet  |           |   YellowClient   |           |    ClearNode     |
    | (Browser)|           |   (Frontend)     |           | (wss://clearnet- |
    |          |           |                  |           |  sandbox.yellow  |
    |          |           |                  |           |  .com/ws)        |
    +----+-----+           +--------+---------+           +--------+---------+
         |                          |                              |
         |                          |                              |
         |  1. User clicks          |                              |
         |     "Start Session"      |                              |
         |------------------------->|                              |
         |                          |                              |
         |                          |  2. generatePrivateKey()     |
         |                          |     -> sessionKey (ephemeral)|
         |                          |     -> sessionKeyAddress     |
         |                          |                              |
         |                          |  3. new WebSocket(CLEARNODE) |
         |                          |----------------------------->|
         |                          |     WebSocket OPEN           |
         |                          |<-----------------------------|
         |                          |                              |
         |                          |  4. createAuthRequestMessage |
         |                          |     { address,               |
         |                          |       session_key,           |
         |                          |       application:"FlowDesk",|
         |                          |       expires_at: now+3600,  |
         |                          |       scope: "console",      |
         |                          |       allowances: [          |
         |                          |         ytest.usd: 1B,       |
         |                          |         eth: 10 ETH          |
         |                          |       ] }                    |
         |                          |----------------------------->|
         |                          |        auth_request          |
         |                          |                              |
         |                          |  5. ClearNode returns        |
         |                          |     auth_challenge           |
         |                          |     (nonce to sign)          |
         |                          |<-----------------------------|
         |                          |                              |
         |  6. EIP-712 signature    |                              |
         |     request via          |                              |
         |     walletClient         |                              |
         |<-------------------------|                              |
         |                          |                              |
         |  7. User signs in        |                              |
         |     wallet popup         |                              |
         |     (MetaMask / etc.)    |                              |
         |------------------------->|                              |
         |                          |                              |
         |                          |  8. createAuthVerifyMessage  |
         |                          |     (signed EIP-712 payload) |
         |                          |----------------------------->|
         |                          |        auth_verify           |
         |                          |                              |
         |                          |  9. ClearNode validates      |
         |                          |     signature, returns:      |
         |                          |     { success: true,         |
         |                          |       jwtToken: "..." }      |
         |                          |<-----------------------------|
         |                          |                              |
         |                          | 10. isAuthenticated = true   |
         |                          |     Start ping interval      |
         |                          |     (every 30s)              |
         |                          |                              |
    +----+-----+           +--------+---------+           +--------+---------+
    |  Wallet  |           |   YellowClient   |           |    ClearNode     |
    +----------+           +------------------+           +------------------+
```

---

## 3. Trading Session Lifecycle (State Machine)

```
                            +-------------------+
                            |                   |
                            |       IDLE        |
                            |                   |
                            | session.status =  |
                            |   "idle"          |
                            | balance: all zero |
                            | channelId: null   |
                            +--------+----------+
                                     |
                                     | openSession(depositAmount)
                                     |   1. client.connect()
                                     |   2. WebSocket opens
                                     |   3. Auth begins
                                     v
                            +-------------------+
                            |                   |
                            |    CONNECTING     |
                            |                   |
                            | session.status =  |
                            |   "connecting"    |
                            | id = session-{ts} |
                            | Authenticating... |
                            +--------+----------+
                                     |
                                     | On auth success:
                                     |   1. POST /faucet/requestTokens
                                     |      (sandbox: get test tokens)
                                     |   2. createCreateChannelMessage()
                                     |      chain_id: 84532 (Base Sepolia)
                                     |      token: 0xDB9F...DEb (ytest.usd)
                                     |   3. sendRequest -> ClearNode
                                     |   4. Extract channelId + clearNodeAddress
                                     |   5. getLedgerBalances()
                                     v
                            +-------------------+
                            |                   |
                            |      ACTIVE       |
                            |                   |
                            | session.status =  |
                            |   "active"        |
                            | channelId: set    |
                            | balance: {usdc:   |
                            |   depositAmount}  |
                            | startTime: now    |
                            | trades: []        |
                            |                   |
                            | [Trades execute   |
                            |  here via state   |
                            |  channel updates] |
                            +--------+----------+
                                     |
                                     | closeSession()
                                     |   1. createCloseChannelMessage()
                                     |   2. sendRequest -> ClearNode
                                     v
                            +-------------------+
                            |                   |
                            |     SETTLING      |
                            |                   |
                            | session.status =  |
                            |   "settling"      |
                            | ClearNode settles |
                            | final balances    |
                            | on-chain          |
                            +--------+----------+
                                     |
                                     | Settlement confirmed
                                     v
                            +-------------------+
                            |                   |
                            |      CLOSED       |
                            |                   |
                            | session.status =  |
                            |   "closed"        |
                            | Final P&L shown   |
                            | Funds returned    |
                            | to wallet         |
                            +-------------------+

    On disconnect() at any state:
      - stopPing()
      - ws.close()
      - isAuthenticated = false
      - jwtToken = null
      - pendingRequests.clear()
      -> returns to IDLE
```

---

## 4. Trade Execution Flow

```
+---------------+    +------------------+    +------------------+    +------------------+
|   User types  |    | useTradingEngine |    |   AI Engine      |    |  YellowClient    |
|   in ChatPanel|    |   (React hook)   |    | (lib/ai/engine)  |    |  .executeTrade() |
+-------+-------+    +--------+---------+    +--------+---------+    +--------+---------+
        |                      |                       |                       |
        |  "Buy $50 of ETH"   |                       |                       |
        |--------------------->|                       |                       |
        |                      |                       |                       |
        |                      |  1. addMessage(user)  |                       |
        |                      |                       |                       |
        |                      |  2. Try /api/chat     |                       |
        |                      |     POST {messages,   |                       |
        |                      |      systemPrompt}    |                       |
        |                      |          |            |                       |
        |                      |          v            |                       |
        |                      |   +-------------+    |                       |
        |                      |   | /api/chat   |    |                       |
        |                      |   | OpenRouter  |    |                       |
        |                      |   | gemini-2.0  |    |                       |
        |                      |   +------+------+    |                       |
        |                      |          |            |                       |
        |                      |          | (or if no  |                       |
        |                      |          |  API key:  |                       |
        |                      |          |  useLocal) |                       |
        |                      |          v            |                       |
        |                      |  3. parseAIResponse() |                       |
        |                      |     OR localTradePar- |                       |
        |                      |     ser() extracts:   |                       |
        |                      |     {action:"trade",  |                       |
        |                      |      type:"buy",      |                       |
        |                      |      tokenIn:"USDC",  |                       |
        |                      |      tokenOut:"ETH",  |                       |
        |                      |      amount: 50}      |                       |
        |                      |                       |                       |
        |                      |  4. validateTrade()---|------>+               |
        |                      |                       |       |               |
        |                      |     Check against ENS |       |               |
        |                      |     preferences:      |       |               |
        |                      |     - amount <= max   |       |               |
        |                      |       TradeSize ($1K) |       |               |
        |                      |     - sufficient      |       |               |
        |                      |       balance check   |       |               |
        |                      |                       |<------+               |
        |                      |     (validation OK)   |                       |
        |                      |                       |                       |
        |                      |  5. executeTrade()----|-------|--------------->|
        |                      |     (type, tokenIn,   |       |               |
        |                      |      tokenOut, amount,|       |               |
        |                      |      prices)          |       |               |
        |                      |                       |       |               |
        |                      |                       |       |    6. Calculate:
        |                      |                       |       |    amountInUsd =
        |                      |                       |       |      50 * 1 (USDC)
        |                      |                       |       |    amountOut =
        |                      |                       |       |      50 / ETH_price
        |                      |                       |       |
        |                      |                       |       |    7. createTransfer-
        |                      |                       |       |       Message()
        |                      |                       |       |       { destination:
        |                      |                       |       |         clearNodeAddr,
        |                      |                       |       |         allocations:
        |                      |                       |       |         [{asset:
        |                      |                       |       |           "ytest.usd",
        |                      |                       |       |           amount: 50}]}
        |                      |                       |       |
        |                      |                       |       |    8. sendRequest()
        |                      |                       |       |       via WebSocket
        |                      |                       |       |       to ClearNode
        |                      |                       |       |           |
        |                      |                       |       |           v
        |                      |                       |       |    +-----------+
        |                      |                       |       |    | ClearNode |
        |                      |                       |       |    | updates   |
        |                      |                       |       |    | state     |
        |                      |                       |       |    | channel   |
        |                      |                       |       |    | alloc.    |
        |                      |                       |       |    +-----------+
        |                      |                       |       |           |
        |                      |                       |       |    9. Response OK
        |                      |                       |       |<----------+
        |                      |                       |       |
        |                      |                       |       |   10. Update local
        |                      |                       |       |       balance:
        |                      |                       |       |       usdc -= 50
        |                      |                       |       |       eth += amountOut
        |                      |                       |       |
        |                      |                       |       |   11. trade.status =
        |                      |                       |       |       "executed"
        |                      |                       |       |       session.trades
        |                      |                       |       |         .push(trade)
        |                      |                       |       |
        |                      |                       |       |   12. calculatePnL()
        |                      |                       |       |       notify() ->
        |                      |                       |       |       UI updates
        |                      |<----------------------|-------|-----------+
        |                      |     Return Trade obj  |       |
        |                      |                       |       |
        |  13. addMessage      |                       |       |
        |      (assistant):    |                       |       |
        |  "Trade executed     |                       |       |
        |   instantly via      |                       |       |
        |   Yellow state       |                       |       |
        |   channel (zero gas)"|                       |       |
        |<---------------------|                       |       |
        |                      |                       |       |
        |  14. UI re-renders:  |                       |       |
        |   - ChatPanel: new   |                       |       |
        |     message          |                       |       |
        |   - BalancePanel:    |                       |       |
        |     updated balances |                       |       |
        |   - TradeHistory:    |                       |       |
        |     new trade row    |                       |       |
        |   - PnL updated     |                       |       |
        |                      |                       |       |
```

---

## 5. Cross-Chain Deposit Flow

```
+----------------+    +--------------------+    +-----------+    +--------------+
|  User          |    | useCrossChainDep-  |    | LI.FI API |    |   Wallet     |
|  (Deposit UI)  |    | osit (React hook)  |    | li.quest  |    | (sendTx)     |
+-------+--------+    +---------+----------+    +-----+-----+    +------+-------+
        |                       |                      |                 |
        |  1. Select source     |                      |                 |
        |     chain from:       |                      |                 |
        |     - Ethereum (1)    |                      |                 |
        |     - Base (8453)     |                      |                 |
        |     - Polygon (137)   |                      |                 |
        |     - Arbitrum (42161)|                      |                 |
        |     - Optimism (10)   |                      |                 |
        |                       |                      |                 |
        |  2. Select token      |                      |                 |
        |     + enter amount    |                      |                 |
        |--------------------->|                      |                 |
        |                       |                      |                 |
        |                       |  3. getQuote()       |                 |
        |                       |     state -> quoting |                 |
        |                       |                      |                 |
        |                       |  GET /v1/quote?      |                 |
        |                       |    fromChain=137     |                 |
        |                       |    toChain=8453      |                 |
        |                       |    fromToken=MATIC   |                 |
        |                       |    toToken=USDC      |                 |
        |                       |    fromAmount=...    |                 |
        |                       |    fromAddress=0x... |                 |
        |                       |--------------------->|                 |
        |                       |                      |                 |
        |                       |  4. LI.FI returns    |                 |
        |                       |     optimal route:   |                 |
        |                       |     - bridge type    |                 |
        |                       |     - estimated out  |                 |
        |                       |     - gas estimate   |                 |
        |                       |     - transactionReq |                 |
        |                       |       { to, data,    |                 |
        |                       |         value,       |                 |
        |                       |         chainId }    |                 |
        |                       |<---------------------|                 |
        |                       |                      |                 |
        |  5. Show quote:       |                      |                 |
        |     "Bridge 100 MATIC |                      |                 |
        |      from Polygon to  |                      |                 |
        |      ~45.20 USDC on   |                      |                 |
        |      Base"            |                      |                 |
        |<---------------------|                      |                 |
        |                       |                      |                 |
        |  6. User clicks       |                      |                 |
        |     "Deposit"         |                      |                 |
        |--------------------->|                      |                 |
        |                       |                      |                 |
        |                       |  7. executeDeposit() |                 |
        |                       |     state -> bridging|                 |
        |                       |                      |                 |
        |                       |  8. sendTransaction  |                 |
        |                       |     { to: LI.FI      |                 |
        |                       |       contract,      |                 |
        |                       |       data: encoded, |                 |
        |                       |       value: amount, |                 |
        |                       |       chainId: src } |                 |
        |                       |----------------------|---------------->|
        |                       |                      |                 |
        |                       |                      |    9. Wallet    |
        |                       |                      |       popup:    |
        |                       |                      |       "Confirm  |
        |                       |                      |        bridge   |
        |                       |                      |        tx"      |
        |                       |                      |                 |
        |                       |                      |   10. User      |
        |                       |                      |       confirms  |
        |                       |                      |       in wallet |
        |                       |                      |<----------------|
        |                       |                      |                 |
        |                       | 11. txHash returned  |                 |
        |                       |<---------------------|-----------------|
        |                       |                      |                 |
        |                       | 12. state -> done    |                 |
        |                       |     txHash stored    |                 |
        |                       |                      |                 |
        | 13. "Deposit          |                      |                 |
        |     complete!         |                      |                 |
        |     Funds bridging    |                      |                 |
        |     to Base."         |                      |                 |
        |<---------------------|                      |                 |
        |                       |                      |                 |

Deposit State Machine:

    +-------+     getQuote()     +----------+
    | idle  |------------------->| quoting  |
    +---+---+                    +----+-----+
        ^                             |
        |  reset()                    | quote received
        |                             v
        |                        +----------+
        +------------------------| idle     |  (with quote stored)
        |                        +----+-----+
        |                             |
        |                             | executeDeposit()
        |                             v
        |                        +----------+
        |                        | bridging |
        |                        +----+-----+
        |                             |
        |          +------------------+------------------+
        |          |                                     |
        |          v                                     v
        |     +----------+                          +----------+
        +-----| done     |                          | error    |
              | txHash   |                          | message  |
              +----------+                          +----+-----+
                                                         |
                                                         | reset()
                                                         v
                                                    +----------+
                                                    | idle     |
                                                    +----------+
```

---

## 6. ENS Preference Flow

```
+==============================================================================+
|                        ENS DeFi Preference Pipeline                          |
+==============================================================================+

Phase 1: Resolution
-------------------

+----------------+     +--------------------+     +------------------------+
| useAccount()   |     | useEnsName()       |     | Ethereum Mainnet       |
| { address,     |---->| { address,         |---->| (chainId: 1)           |
|   isConnected }|     |   chainId: 1 }     |     | ENS Registry           |
+----------------+     +----------+---------+     | -> Reverse resolution  |
                                  |               | -> "alice.eth"         |
                                  v               +------------------------+
                       +--------------------+
                       | normalize(ensName) |
                       | via viem/ens       |
                       +----------+---------+
                                  |
                                  v
                       +--------------------+     +------------------------+
                       | useEnsAvatar()     |---->| ENS Resolver           |
                       | { name, chainId:1 }|     | -> avatar URL          |
                       +--------------------+     +------------------------+


Phase 2: Preference Loading (8 parallel useEnsText calls)
---------------------------------------------------------

                       normalizedName
                            |
            +---------------+---------------+
            |               |               |
            v               v               v
    +---------------+ +---------------+ +------------------+
    | useEnsText()  | | useEnsText()  | | useEnsText()     |
    | key:          | | key:          | | key:             |
    | "com.flowdesk | | "com.flowdesk | | "com.flowdesk.   |
    |  .slippage"   | |  .risk-level" | |  favorite-pairs" |
    | -> "0.5"      | | -> "moderate" | | -> "ETH/USDC,    |
    +---------------+ +---------------+ |    WBTC/USDC"    |
                                        +------------------+
    +---------------+ +---------------+ +------------------+
    | useEnsText()  | | useEnsText()  | | useEnsText()     |
    | key:          | | key:          | | key:             |
    | "com.flowdesk | | "com.flowdesk | | "com.flowdesk.   |
    |  .max-trade-  | |  .take-profit"| |  stop-loss"      |
    |  size"        | | -> "5"        | | -> "3"           |
    | -> "1000"     | +---------------+ +------------------+
    +---------------+
    +---------------+ +---------------+
    | useEnsText()  | | useEnsText()  |
    | key:          | | key:          |
    | "com.flowdesk | | "com.flowdesk |
    |  .preferred-  | |  .session-    |
    |  chain"       | |  budget"      |
    | -> "84532"    | | -> "500"      |
    +---------------+ +---------------+


Phase 3: Merge with Defaults
-----------------------------

    +---------------------------+       +---------------------------+
    |  ENS text record values   |       | DEFAULT_PREFERENCES       |
    |  (may be null/undefined   |       | {                         |
    |   if not set on-chain)    |       |   slippage: 0.5,          |
    +-------------+-------------+       |   riskLevel: "moderate",  |
                  |                     |   favoritePairs:          |
                  |  useMemo()          |     ["ETH/USDC",          |
                  |  merge: ENS         |      "WBTC/USDC"],        |
                  |  value ?? default   |   maxTradeSize: 1000,     |
                  |                     |   takeProfit: 5,          |
                  v                     |   stopLoss: 3,            |
    +---------------------------+       |   preferredChain: 84532,  |
    | DeFiPreferences object    |       |   sessionBudget: 500      |
    | (final merged result)     |       | }                         |
    +-------------+-------------+       +---------------------------+
                  |
                  |
                  v

Phase 4: Injection into AI System Prompt
-----------------------------------------

    +---------------------------+
    | DeFiPreferences           |
    +-------------+-------------+
                  |
                  |  getSystemPrompt(preferences, balance, prices)
                  v
    +-------------------------------------------------------+
    | AI System Prompt includes:                            |
    |                                                       |
    | "USER PREFERENCES (from ENS profile):                 |
    |  - Risk Level: moderate                               |
    |  - Max Trade Size: $1000                              |
    |  - Slippage Tolerance: 0.5%                           |
    |  - Take Profit Target: 5%                             |
    |  - Stop Loss Limit: 3%                                |
    |  - Favorite Pairs: ETH/USDC, WBTC/USDC"              |
    +---------------------------+---------------------------+
                                |
                                v

Phase 5: AI Validates Trades Against Preferences
-------------------------------------------------

    +---------------------------+
    | User: "Buy $2000 of ETH"  |
    +-------------+-------------+
                  |
                  v
    +---------------------------+       +---------------------------+
    | validateTrade()           |       | DeFiPreferences           |
    |                           |<------| maxTradeSize: 1000        |
    | tradeValueUsd = $2000     |       +---------------------------+
    | maxTradeSize  = $1000     |
    |                           |
    | $2000 > $1000             |
    |  -> REJECTED              |
    +---------------------------+
                  |
                  v
    +---------------------------------------------+
    | "Trade value ($2000.00) exceeds your max     |
    |  trade size ($1000). Reduce amount or update |
    |  your ENS preferences."                      |
    +---------------------------------------------+


Phase 6 (Optional): Update Preferences via ENS Settings
---------------------------------------------------------

    +----------------+     +--------------------+     +--------------------+
    | ENSSettings    |     | serializePrefs()   |     | ENS Public         |
    | component      |---->| Convert to array   |---->| Resolver           |
    | (edit form)    |     | of {key, value}    |     | setText() x8       |
    |                |     | pairs for batch    |     | (single batched    |
    |                |     | write              |     |  transaction)      |
    +----------------+     +--------------------+     +--------------------+
```

---

## 7. Complete User Journey (End-to-End)

```
    [START]
       |
       v
+------------------+
| 1. Visit app     |
|    page.tsx       |
+--------+---------+
         |
         v
+------------------+     NO      +----------------------------+
| 2. Wallet        |------------>| Show "Connect Wallet"      |
|    connected?    |             | button (RainbowKit)        |
+--------+---------+             +----------------------------+
         | YES
         v
+------------------+
| 3. Resolve ENS   |
|    useEnsName()  |
|    chainId: 1    |
+--------+---------+
         |
         +------------ Has ENS? ------ YES ---+
         |                                     |
         | NO                                  v
         |                          +---------------------+
         v                          | 4. Load 8 ENS text  |
+------------------+                |    records           |
| Use default      |                |    (com.flowdesk.*)  |
| preferences      |                +----------+----------+
+--------+---------+                           |
         |                                     v
         +<------------------------------------+
         |
         v
+------------------+
| 5. Show Trading  |
|    Terminal       |
|    - ChatPanel   |
|    - Balances    |
|    - History     |
+--------+---------+
         |
         |  User clicks "Start Session"
         v
+------------------+
| 6. Open Yellow   |
|    session:      |
|    connect() ->  |
|    authenticate->|
|    openSession() |
+--------+---------+
         |
         v
+------------------+     Optional     +-------------------------+
| 7. Session       |----------------->| 7a. Cross-Chain Deposit |
|    ACTIVE        |                  |     via LI.FI           |
|    Ready to      |                  |     (any chain -> Base) |
|    trade         |                  +-------------------------+
+--------+---------+
         |
         |  User types trade commands
         v
+------------------+
| 8. AI parses     |
|    command ->    |
|    validate ->   |
|    execute via   |
|    state channel |
|    (zero gas,    |
|     instant)     |
+--------+---------+
         |
         |  (repeat trades as needed)
         |
         v
+------------------+
| 9. User clicks   |
|    "Close Session"|
+--------+---------+
         |
         v
+------------------+
| 10. Settlement   |
|     ClearNode    |
|     settles      |
|     final state  |
|     on-chain     |
+--------+---------+
         |
         v
+------------------+
| 11. Funds back   |
|     in wallet    |
|     Final P&L    |
|     displayed    |
+------------------+
         |
         v
      [END]
```

---

## 8. WebSocket Message Protocol (ClearNode Communication)

```
    Client (YellowClient)                          ClearNode Server
    ======================                          ================

    --- Authentication Phase ---

    auth_request  --------------------------------->
    { address, session_key, application,
      expires_at, scope, allowances }

                  <--------------------------------- auth_challenge
                                                    { nonce/challenge data }

    auth_verify   --------------------------------->
    { signed EIP-712 payload }

                  <--------------------------------- auth_verify response
                                                    { success: true,
                                                      jwtToken: "..." }

    --- Session Phase ---

    create_channel -------------------------------->
    { chain_id: 84532,
      token: "0xDB9F...DEb" }

                  <--------------------------------- create_channel response
                                                    { channelId, participants,
                                                      allocations }

    get_ledger_balances --------------------------->

                  <--------------------------------- get_ledger_balances resp
                                                    { ledgerBalances: [...] }

    --- Trading Phase (repeatable) ---

    transfer      --------------------------------->
    { destination: clearNodeAddress,
      allocations: [
        { asset: "ytest.usd", amount: "50" }
      ] }

                  <--------------------------------- transfer response
                                                    { success }

                  <--------------------------------- balance_update
                                                    (push notification)

                  <--------------------------------- transfer_notification
                                                    (push notification)

    --- Keep-Alive ---

    ping          --------------------------------->
    (every 30 seconds)

                  <--------------------------------- pong

    --- Teardown ---

    close_channel --------------------------------->
    { channelId, walletAddress }

                  <--------------------------------- close_channel response
                                                    { final settlement data }

    [WebSocket closes]
```
