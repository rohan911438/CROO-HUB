# CROO Hub ↔ CROO Network (CAP) Compatibility Report

**Status: research complete, no integration code written yet — this report is the checkpoint
requested before implementation begins.**

Researched directly from croo.network, agent.croo.network, and the full developer docs tree at
docs.croo.network (23 pages: protocol architecture, core mechanics, account/wallet architecture,
service registration, order lifecycle, Node/Go/Python SDK references, smart contracts, security &
trust model, roadmap, FAQ). Everything below is sourced from those pages, not assumed.

---

## 1. What CROO Network actually is

CROO Network ("CROO Agent Protocol" / CAP) is a real, live-but-early-stage decentralized agent
commerce protocol on **Base L2**. As of this research, `agent.croo.network` (the Agent Store)
shows **0 agents, 0 orders, $0 volume** — the ecosystem is real and documented, but has no
production traffic yet. That matters: we're integrating with a young platform, not a mature one.

**Core shape**: every "Agent" on CROO is a bundle of three things, created together through
CROO's own onboarding, not by a third party:
- An **Agent DID** — an ERC-8004 identity NFT (sovereign, transferable ownership)
- A **Sovereign Vault** — an ERC-4337 account-abstraction wallet, deployed via Biconomy's Nexus
  factory (CREATE2), gas-sponsored by CROO's own Paymaster (Pimlico)
- **CROO Merit** — an on-chain reputation record ("completion rate, responsiveness, dispute
  history")

**CAP (Coordination & Commerce layer)** turns a service request into a verifiable, escrowed,
on-chain-settled transaction through four phases: `NEGOTIATION → LOCK → DELIVER → CLEAR` (the
Node SDK exposes this as order states `created → paid → completed` plus `rejected`/`expired`).

### Confirmed end-to-end flow (from CROO's own Quick Start page, verbatim source)

```
Requester                                  Provider
    │                                          │
    ├─ NegotiateOrder ────────────────────────►│
    │                                          ├─ AcceptNegotiation
    │◄── [WebSocket] order_created ────────────┤
    ├─ PayOrder                                │
    │   (USDC Escrow locked in CAPVault)       │
    │                                          │◄── [WebSocket] order_paid
    │                                          ├─ DeliverOrder
    │◄── [WebSocket] order_completed ──────────┤
    ├─ GetDelivery                             │
    │   → {"analysis": "completed"}            ├─ Settlement received ✓
    ▼ Done                                     ▼ Waiting for next order
```

This confirms two operational details that matter for our integration:
1. **Every side of a transaction needs its own separately-registered CROO Agent** (and its own
   `croo_sk_...` key) — a Provider agent and a Requester agent are registered independently
   through the dashboard, each getting their own AA wallet + API key. Our backend would need a
   CROO Agent identity *per CROO-Hub agent that wants to sell through CAP*, not one shared
   platform-level credential.
2. **USDC must be deposited to the Agent's AA Wallet address specifically** ("visible in the
   Dashboard under your Agent's Configure page. NOT the Controller / Executor address") — the
   dashboard exposes at least two distinct addresses per agent, and funding the wrong one is a
   documented footgun we need to defend against in any UI we build (e.g. label fields exactly as
   CROO does, never let a user paste the Executor address into a "send USDC here" field).

### Deployed contracts (Base **Mainnet**, chain id `8453` — no testnet addresses published)

| Contract | Address | Role |
|---|---|---|
| CAPCore | `0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821` | Protocol entry point — order-phase state machine, manages state not funds |
| CAPVault | `0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d` | Escrow custody, fee split (platform + provider), manages funds not state |
| CROOValidationModule | `0xfCc7eefd6D22bC6a4F35B467928ecAF738d0B3b8` | ERC-7579 permission module on each Agent's AA wallet (Owner vs Executor role, selector whitelists) |
| CROOExchange | not published | Agent ownership trading (ships Phase 3, Q3 2026 per roadmap) |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base mainnet USDC — the only settlement currency CAP supports today |

### Access model — this is the part that changes the most for us

Developers **never hold a signing key for on-chain CAP actions**. Integration is entirely via:
- An API key (`croo_sk_...`) obtained by registering an Agent through the **Agent Store
  dashboard UI** (agent.croo.network → My Agents → Register Agent) — there is **no documented
  API/SDK call to create an Agent or a Service programmatically**. Registration is explicitly a
  human, dashboard-driven step; only *post-registration* operations (negotiate, pay, deliver,
  list orders, websocket events) are SDK-automatable.
- An official SDK (`@croo-network/sdk` on npm, Node 18+; also Go and Python) that talks to
  `api.croo.network` / `wss://api.croo.network/ws`. CROO's own platform Executor key signs the
  actual on-chain transactions; the SDK just constructs intents.

---

## 2. Compatibility audit — our contracts/backend/frontend vs. CROO

| CROO Hub component | CROO/CAP equivalent | Status | Recommendation |
|---|---|---|---|
| `AgentRegistry.sol` (Base Sepolia, plain `owner` + metadata mapping) | Agent DID (ERC-8004 NFT) + AA wallet, minted by CROO on dashboard registration | **Partially aligned, structurally different.** Both are "agent identity," but ours is a lightweight mapping and theirs is an NFT+AA-wallet bundle we don't control or mint. | Keep `AgentRegistry` unchanged as the CROO-Hub-native identity. Add an *additive* cross-reference (`crooAgentId`/DID token id, once an agent is manually registered on CROO) — don't try to make our contract emit ERC-8004 tokens; CROO already owns that mint. |
| `EscrowCommerce.sol` (our own USDC escrow, Base Sepolia) | CAPCore + CAPVault (Base **mainnet**, CROO-custodied escrow) | **Conceptually similar state machine, but not mergeable.** CAP's fund custody is CROO's own AA infrastructure — there's no documented mechanism for CAP to settle through a third party's escrow contract. "Connect EscrowCommerce through CAP" isn't achievable as literally stated. | Keep `EscrowCommerce` exactly as-is for CROO-Hub-native (direct) bookings. Add a **separate, parallel** CAP order adapter (via the SDK) for agents transacting *through the CROO Agent Store*. Reconcile both into the same `Transaction` read model in MongoDB with a new `settlementMethod: 'cap_settled'` value alongside the existing `'on_chain_pending'`/`'placeholder_offchain'`. |
| `Reputation.sol` | CROO Merit | **Parallel systems, no bridging API found.** Docs mention Merit exists but give no public read/write schema. | Keep our Reputation contract as the source of truth for CROO-Hub-native reputation. Revisit bridging only if/when CROO documents a public Merit API — don't fabricate one now. |
| `OrchestrationMetadata.sol` | No CAP equivalent | **No overlap — CAP has no multi-agent workflow/DAG concept**, only single-order lifecycle. | Leave entirely unchanged. |
| Backend discovery (MongoDB-backed marketplace) | CROO Navigator (AI assistant) + Agent Store search | **Both largely off-chain/proprietary today**; no public CAP discovery/search API surfaced in docs. | Don't replace our discovery engine. Add an optional "Also listed on CROO Agent Store" indicator once an agent has a `crooAgentId` configured. |
| Frontend wallet integration (wagmi/RainbowKit, user's own EOA signs our contract calls) | Owner EOA (self-custodied, withdrawals only) + platform-managed Executor AA wallet (signs order/payment ops, key never leaves CROO) | **Different UX model, not a drop-in replacement.** Our flow is "connect wallet, sign each tx." CROO's is "paste an API key, CROO signs for you." | Don't change the existing wallet-connect flow (still needed for our own contracts). Add a separate credential field (the `croo_sk_...` key) in a new CROO Integration settings panel — this is API-key auth, not wallet-signature auth. |

---

## 3. Hard blockers — need your input before I write integration code

1. **I cannot obtain a `croo_sk_...` API key myself.** Getting one requires signing up/logging
   into `agent.croo.network` (wallet, Google, or email) and manually registering at least one
   Agent through their dashboard — the same category of limitation as the Basescan API key
   earlier. Without a real key, I can build the adapter code but cannot exercise it end-to-end
   against the live API.
2. **CAP is Base *mainnet* only.** There is no testnet deployment of CAPCore/CAPVault (the
   roadmap's Phase 1 "testnet" reference is for CROO's own identity/reputation layer, not CAP
   itself). Real integration testing means real USDC and a live mainnet Agent — a materially
   different risk profile than the Base Sepolia demo we deployed. I want explicit confirmation
   before wiring anything that could move real funds.
3. **"Every registered agent should be capable of being registered into the CROO Agent Store
   through the appropriate CAP workflow"** isn't achievable as full automation today — there is
   no documented create-agent/create-service API. The realistic deliverable is a **guided
   registration flow**: our backend validates/generates the exact metadata CROO's dashboard
   wizard expects and pre-fills or displays it for the user to paste in, then captures the
   resulting API key. True one-click "Publish to CROO" isn't possible until CROO ships that API
   (their roadmap doesn't mention one).

## 4. Proposed phased plan (pending your go-ahead on the blockers above)

- **Phase A** — `backend/src/services/cap/` adapter wrapping `@croo-network/sdk`, config-driven
  per agent, starting with read-only health/status checks (no fund movement).
- **Phase B** — additive MongoDB fields on `Agent`/`Transaction` (`crooAgentId`,
  `crooSyncStatus`, `crooApiKeyConfigured`, `lastSyncedAt`, `settlementMethod: 'cap_settled'`) —
  no schema breakage, nothing removed.
- **Phase C** — the "CROO Integration" dashboard section you described (connection status,
  registration status, sync status, protocol version, logs) plus the guided-registration flow
  from blocker #3, using a real API key once you have one.
- **Phase D** — order lifecycle bridging: CROO websocket events (`OrderPaid`, `OrderCompleted`,
  etc.) mirrored into our `Transaction`/`Reputation` records so dashboards show one unified view
  regardless of which rail (our `EscrowCommerce` vs. CROO's CAP) actually settled the payment.
- **Phase E** — logging, retries, health checks, protocol-version validation, and this doc kept
  current as the integration evolves.

Nothing in Phases A–E requires touching `AgentRegistry.sol`, `EscrowCommerce.sol`,
`Reputation.sol`, or `OrchestrationMetadata.sol` — per the audit above, they stay as the
CROO-Hub-native rail and CAP becomes an additive, parallel integration surface.

---

## 5. Implementation log (Phases A–D shipped)

A real `croo_sk_...` key was provided and verified against the live API before any of this was
built. Everything below was tested against `api.croo.network`, not mocked.

### Backend (`backend/`)

- **`.env` / `.env.example`** — added `CROO_API_URL`, `CROO_WS_URL`, `CROO_SDK_KEY`,
  `CROO_RPC_URL`. Real key is in `.env` only (gitignored); `.env.example` documents how to obtain
  one (dashboard registration, no automation possible).
- **`@croo-network/sdk@0.2.1`** installed — confirmed as the real, official package (published by
  `croo-network <infra@croo.network>`, matches `github.com/CROO-Network/node-sdk`).
- **`src/config/env.ts`** — added a `croo` config block with an `isConfigured` getter so the rest
  of the app can no-op cleanly when no key is set.
- **`src/services/cap/capClient.ts`** — lazily-constructed, cached `AgentClient` singleton.
- **`src/services/cap.service.ts`** — `getCapStatus()` (connectivity health check),
  `listCapOrders`/`listCapNegotiations` (error-normalized passthroughs),
  `buildRegistrationGuide()` (generates the exact Agent Store wizard payload from a MongoDB
  `Agent` doc - name, description, skill-tag candidates, price, SLA, deliverable/requirements
  type - since no create-agent API exists), `linkCapAgent`/`unlinkCapAgent`/`listMyAgentsForCap`.
- **`src/services/cap/capEventListener.ts`** — WebSocket listener (`connectWebSocket()`) that
  mirrors `OrderPaid`/`OrderCompleted`/`OrderRejected`/`OrderExpired` events into the
  `Transaction` collection, but **only for orders whose `providerAgentId` matches an
  already-linked CROO-Hub agent** — unrelated network activity is ignored. Never throws;
  a misconfigured/unreachable CAP cannot take down the rest of the API. Started fire-and-forget
  from `server.ts` bootstrap.
- **Models** — `Agent`: added `crooAgentId`, `crooServiceId`, `crooSyncStatus`,
  `crooLastSyncedAt` (additive, nothing removed). `Transaction`: added `'cap_settled'` to
  `settlementMethod`, added `capMeta` (orderId, negotiationId, chainOrderId, status, tx hashes).
- **Routes** (`/api/v1/cap/*`) — `GET /status` (public), `GET /my-agents`, `GET
  /agents/:slug/registration-guide`, `POST /agents/:slug/link`, `POST /agents/:slug/unlink`,
  `GET /orders`, `GET /negotiations` (all auth-gated except `/status`, ownership-checked where an
  agent slug is involved).

**Real-API corrections made during verification** (the SDK's TypeScript types don't fully match
server behavior):
- `listOrders`/`listNegotiations` type `role` as optional, but the live API returns
  `400 INVALID_PARAMETERS` without it. Confirmed valid values: orders accept `'provider'` or
  `'buyer'`; negotiations accept `'provider'` or `'requester'` (different vocabulary between the
  two endpoints). Both our status check and controller default to `role=provider`, since CROO
  Hub's configured identity sells services.
- Confirmed `GET /cap/status` live: `{ configured: true, connected: true, protocolVersion: "CAP
  v2 (Base mainnet, chain 8453)", ... }` against the real key - not a simulated response.

### Frontend (`frontend/`)

- **`src/lib/api.ts`** — added a `cap` namespace (`status`, `myAgents`, `registrationGuide`,
  `linkAgent`, `unlinkAgent`, `orders`, `negotiations`), following the existing `request<T>()`
  pattern (this is the first real (non-mocked) data-driven section added to this dashboard).
- **`src/components/dashboard/sidebar.tsx`** — added a "CROO Integration" entry under the
  Developer section.
- **`src/app/(dashboard)/croo-integration/page.tsx`** — new dashboard page covering every field
  requested: connection status, per-agent registration/publication/sync status, supported CAP
  capabilities, protocol version, and a guided registration dialog (steps + pre-filled metadata +
  a form to paste back the resulting CROO Agent/Service ID). Two fields could not be built as
  originally envisioned, and are called out honestly in the UI rather than faked:
  - **Wallet information** — CAP does not expose an agent's AA wallet address via any documented
    API before its first order exists (it's dashboard-only); the page does not fabricate one.
  - **Registration logs** — no persistent audit-log store was added (would be over-scoped for
    this pass); the page surfaces `crooLastSyncedAt` per agent as the sync-activity signal instead.

### What was intentionally *not* built

- **No automated "Publish to CROO Store" button** — confirmed no such API exists. The guided
  dialog is the honest ceiling of automation possible today.
- **No real `payOrder`/`acceptNegotiation`/fund-moving calls executed** — this pass is read +
  settlement-mirror only. Initiating real orders needs a second, independently-registered CROO
  Agent to act as counterparty (see §1's confirmed flow diagram) and real USDC; that's a
  deliberate follow-up, not something to trigger silently during an integration build.
- **No changes to any `.sol` contract** — confirmed unnecessary per the §2 audit.

---

## 6. Agent Commerce: end-to-end Planner-driven order execution

A second research pass (same date) re-confirmed no new endpoints, no SDK update
(`@croo-network/sdk` still `0.2.1`), and no new docs pages (still 23) since §1-5 were written.
One new fact matters a lot: **the CROO Network marketplace has zero registered services from
anyone**, not just CROO Hub - `agent.croo.network` still shows 0 agents/0 orders/$0 volume
network-wide, and the SDK exposes no `listServices`/`searchServices` method at all. A requester
is expected to already know a `serviceId`; there is no programmatic way to find one. That single
fact drives everything below.

### Architecture

```
Planner (services/planner.service.ts)
  -> Discovery Engine (services/discovery.service.ts, unchanged, real Mongo Agent data)
  -> AgentOrder (models/AgentOrder.ts) - persisted after every state transition
  -> executor adapter, chosen per order:
       - services/planner/liveExecutor.ts   (real CAP SDK calls: negotiateOrder/payOrder/
                                              getOrder/getDelivery, bounded polling, no discovery)
       - services/planner/simulatedExecutor.ts (local, deterministic, clearly-labeled timings)
  -> on completion:
       - reputationAnalytics.service.ts  (off-chain Agent.reputationScore/performance update)
       - services/chain/orchestrationClient.ts (real Base Sepolia anchoring via the already-
         deployed OrchestrationMetadata contract - a complementary trust layer, not a CAP
         requirement)
```

The Planner never talks to CAP or the chain directly - it only calls the executor and the
anchoring client, both swappable behind their own small interfaces. This mirrors the isolation
principle from §2: adapters absorb protocol limitations, not the orchestrator.

### Why simulated is the default, and what "simulated" actually means here

`decideExecutionMode()` only attempts `live` when the caller supplies a real `targetServiceId` -
there being no discovery API, there is nothing else to target. Since nobody on the network has
registered a service, every order today runs `simulated` by default. But "simulated" is narrower
than it sounds:

| Layer | Simulated mode | Live mode |
|---|---|---|
| Negotiation/accept/pay/deliver timing & events | Local, fake ids prefixed `sim_` | Real CAP SDK calls, real ids |
| MongoDB persistence (`AgentOrder`, event history) | Real | Real |
| Off-chain reputation analytics | Real | Real |
| **On-chain execution proof** (Base Sepolia, `OrchestrationMetadata.recordExecution`) | **Real** | **Real** |

The on-chain anchoring step is identical in both modes and always real - it's a proof that "the
Planner ran this task and reached this outcome," independent of which settlement rail handled the
(possibly fake, possibly real) payment. Verified live during this build: 4 real
`recordExecution` transactions on Base Sepolia, each producing a genuine, incrementing
`executionId` and a real Basescan-visible transaction (e.g. execution #4,
`0xa60527749229d1569f5b13aa74236174da3eecd486f7f76eb0d9729194f309fc`).

### Limitations encountered + workarounds (in the order found)

1. **No service discovery API.** *Workaround*: `targetServiceId` is an optional, explicit input;
   omitting it (the common case today) routes straight to the simulator instead of pretending to
   search for something no API can return.
2. **Live execution requires an independent second CROO Agent actively listening** (confirmed via
   the Quick Start flow diagram in §1) **and the whole network currently has none.**
   *Workaround*: `liveExecutor.ts` is implemented against the real documented SDK contract
   (bounded polling, 45s negotiation timeout / 60s order timeout, no infinite waits) so it is
   ready the moment a real service exists, but it has not been exercised against a live
   counterparty - that's stated plainly here rather than claimed as tested.
3. **`OrchestrationMetadata.recordExecution`'s `participatingAgents` expects real EVM addresses,
   but CROO Hub's MongoDB Users/Agents have no linked wallet in this build.** *Workaround*: every
   anchored execution records CROO Hub's own signer address as the sole participant - an honest
   "the Planner recorded this" proof, not a fabricated claim that a specific end-user wallet
   participated on-chain.
4. **On-chain Reputation.sol only accepts writes from `EscrowCommerce` (`RECORDER_ROLE`), by
   design** (see blockchain/README.md §5) - CAP/simulated orders never touch `EscrowCommerce`.
   *Workaround*: Agent Commerce outcomes update a separate, explicitly off-chain analytics field
   (`Agent.reputationScore`/`performance` in MongoDB) rather than weakening that contract's access
   control or fabricating an escrow event that never happened. `Reputation.sol` remains the
   single source of truth for CROO-Hub-native, on-chain-escrow-settled reputation.
5. **Two bugs were found and fixed during live verification, not left in place**: the hand-copied
   ABI fragment for anchoring was initially missing `getExecutionIdByWorkflowRef` entirely
   (caught immediately by the order's own error handling, which logged it as a failed event
   instead of crashing); and reading `executionId` back via a follow-up RPC call after `tx.wait()`
   intermittently returned `0` against the public `sepolia.base.org` endpoint (a read-after-write
   lag across a load-balanced node) - fixed by decoding `executionId` directly from the
   transaction receipt's own event log, which needs no follow-up round trip and cannot lag.

### Remaining integration opportunities / roadmap

- **If CROO ever ships a service directory or search API**: `liveExecutor.ts` already expects a
  `serviceId`; adding discovery only requires a new call inside `planner.service.ts`'s mode
  decision, no executor changes.
- **If a second CROO Agent becomes available** (registered by this team or a real third party):
  set `requestedMode: 'live'` with its `serviceId` and the exact same order pipeline runs for
  real, with the same MongoDB/dashboard/anchoring behavior - nothing else changes.
- **Wallet linkage**: adding a real wallet-address field to `User`/`Agent` would let
  `participatingAgents` record genuine per-user addresses instead of the platform signer,
  strengthening the on-chain proof's specificity.
- **CROO Merit bridging**: still no public API found for it; revisit if CROO documents one.
