# CROO Hub — On-Chain Trust Layer

Solidity smart contracts for **CROO Hub**, the intelligent operating system for the AI Agent
Economy. This package is the decentralized trust layer: identity, payments, reputation, and
immutable proof of execution. It performs **no AI inference and no business logic** — all
orchestration and agent computation stays off-chain in the CROO Hub backend
(`../backend`). The chain only answers four questions with finality: *who owns this agent*, *was
this payment settled fairly*, *does this agent have a track record*, and *what actually ran*.

Built with Hardhat + TypeScript + OpenZeppelin, targeting **Base Sepolia** (fully EVM compatible,
chain id `84532`).

---

## 0. Live deployment (Base Sepolia)

Deployed and wired end-to-end on **2026-07-06**, independently confirmed via Basescan's public
explorer (6 transactions from the deployer: 5 contract creations + 1 role grant, all visible at
[the deployer's address](https://sepolia.basescan.org/address/0xb7fE3218d2c9a90Dc59bd966483C65F66FAD589C)).
Full record with constructor args: [`deployments/baseSepolia.json`](deployments/baseSepolia.json).

| Contract | Address | Deployment tx | Explorer |
|---|---|---|---|
| MockUSDC (test token) | `0x31bAc56682643857d32896c3d5D3c610E00E3729` | [`0x6ac0111...c1c77d17d`](https://sepolia.basescan.org/tx/0x6ac011101e2a9bb2dc213686d591052bea2cf93b7cfd42f43f99a9cc1c77d17d) | [view](https://sepolia.basescan.org/address/0x31bAc56682643857d32896c3d5D3c610E00E3729) |
| AgentRegistry | `0x4063747fEeb712Ab0E5F4Ca1285D3C899AA5CcE0` | [`0x2a3f37b...fa73ff35d`](https://sepolia.basescan.org/tx/0x2a3f37bf9769c36a1b535a45a68fab25a03e3bd6defb833fdb02101fa73ff35d) | [view](https://sepolia.basescan.org/address/0x4063747fEeb712Ab0E5F4Ca1285D3C899AA5CcE0) |
| Reputation | `0x5d06e234368359DeE43a2be089ACc7B1ee6Cf6B3` | [`0xd22e17f...db97a34c66`](https://sepolia.basescan.org/tx/0xd22e17f7dc1cdb30e1be03e843b97ff2b55aeac87062d98864d704db97a34c66) | [view](https://sepolia.basescan.org/address/0x5d06e234368359DeE43a2be089ACc7B1ee6Cf6B3) |
| EscrowCommerce | `0xe81D5902e9745C12F36347433649da031F4d268B` | [`0xac15e6c...b961f104d2`](https://sepolia.basescan.org/tx/0xac15e6c6f9ed65140243c89ef0121320502965c6df4d597b604ab9b961f104d2) | [view](https://sepolia.basescan.org/address/0xe81D5902e9745C12F36347433649da031F4d268B) |
| OrchestrationMetadata | `0x0b4223248bcBde8809b6DE111758CA37f40930Bc` | [`0xc41b256...698eacf4325`](https://sepolia.basescan.org/tx/0xc41b2564f6661516b9fcee8d0b3ca12d3b8d6424af589cb77d2ec698eacf4325) | [view](https://sepolia.basescan.org/address/0x0b4223248bcBde8809b6DE111758CA37f40930Bc) |

Role wiring tx (`Reputation.grantRole(RECORDER_ROLE, EscrowCommerce)`):
[`0x8a3faa5...a31d29fc1`](https://sepolia.basescan.org/tx/0x8a3faa5762cba6df963d25177d5edf0b9335bee12d0842753918b05a31d29fc1)

- **Admin / deployer**: `0xb7fE3218d2c9a90Dc59bd966483C65F66FAD589C` — a throwaway deployment key
  generated solely for this testnet rollout, holding `DEFAULT_ADMIN_ROLE`, `VERIFIER_ROLE`
  (AgentRegistry), and `ARBITRATOR_ROLE` (EscrowCommerce). **Replace with a multisig before any
  mainnet or higher-value testnet deployment** (see §5, Security assumptions).
- **`RECORDER_ROLE`** on Reputation has already been granted to the deployed EscrowCommerce
  address, so escrow settlements sync to reputation out of the box.
- **USDC**: no official Circle USDC contract was configured for this deployment
  (`USDC_ADDRESS` unset), so `deploy.ts` auto-deployed `MockUSDC` — a 6-decimal test token with a
  public `faucet()` function (mints 1,000 test-USDC to any caller) for exercising `EscrowCommerce`
  end-to-end without needing real funds. Swap in Base Sepolia's real USDC address and redeploy
  `EscrowCommerce` (or use `setReputationContract`-style admin wiring, once an equivalent
  `setUsdc` is added) before handling real value.
- **Protocol fee**: `0` bps (fees disabled) with `feeRecipient` set to the admin address above.
- **Source verification**: not yet run — verifying requires a Basescan API key
  (`basescan.org/myapikey`), which wasn't available at deploy time. Once you have one, add it to
  `.env` as `BASESCAN_API_KEY` and run `npm run verify:baseSepolia`; it reads addresses/args
  straight out of `deployments/baseSepolia.json`, no manual re-entry needed.
- **Funding note**: the deployer wallet was funded by bridging Sepolia ETH to Base Sepolia via
  the official `L1StandardBridge.bridgeETHTo` (`0xfd0Bf71F60660E2f608ed56e1659C450eB113120` on
  Ethereum Sepolia) rather than an L2-native faucet, since faucet access required an existing
  mainnet ETH balance that wasn't available.

To interact with this exact deployment:

```bash
npx hardhat run scripts/interact/demo.ts --network baseSepolia
```

---

## 1. Architecture

Four independent, individually-deployable contracts, wired together only through minimal
interfaces (`contracts/interfaces/*.sol`):

```
                 ┌───────────────────┐
                 │   AgentRegistry   │  identity: who owns which agent, is it active/available
                 └─────────┬─────────┘
                           │ read-only: getAgentOwner / isAgentAvailable / agentExists
              ┌────────────┼───────────────────┐
              │            │                   │
   ┌──────────▼────────┐   │        ┌──────────▼─────────────┐
   │  EscrowCommerce    │   │        │  OrchestrationMetadata  │
   │  (holds USDC)      │   │        │  (holds no funds)       │
   └──────────┬─────────┘   │        └─────────────────────────┘
              │ RECORDER_ROLE (write, on settlement only)
   ┌──────────▼─────────┐
   │     Reputation      │
   └──────────────────────┘
```

- **AgentRegistry** — decentralized identity for AI agents. The only contract that defines
  "who owns agent #N" and "is agent #N usable right now."
- **EscrowCommerce** — the only contract that moves value. Buyers lock USDC for a specific
  agent; funds move only through explicit state transitions.
- **Reputation** — an immutable performance ledger, written *only* by EscrowCommerce as the
  direct consequence of a settled escrow. Never accepts arbitrary user-submitted scores.
- **OrchestrationMetadata** — an audit trail. Anchors hashes/URIs proving a workflow ran, which
  agents participated, and when — never executes anything.

Every contract can be deployed and used on its own; EscrowCommerce and Reputation additionally
read `AgentRegistry` through `IAgentRegistry`, and EscrowCommerce writes to `Reputation` through
`IReputation`. Nothing depends on another contract's storage layout — only on its interface.

### Why this shape

The blockchain is treated as a **trust-minimized coprocessor**, not a database or a runtime.
Storing full workflow graphs, rich agent docs, or ML-scored reputation on-chain would be slow,
expensive, and pointless — the EVM cannot run inference anyway. Instead every contract stores the
smallest set of fields needed to make its guarantee *tamper-proof*, and points (via `metadataURI` /
hashes) to richer off-chain data in IPFS or MongoDB.

---

## 2. Contracts

### 2.1 AgentRegistry (`contracts/AgentRegistry.sol`)

On-chain identity for AI agents. Each agent gets a sequential `agentId` (starting at 1) owned by a
wallet address.

**Storage per agent** (`Agent` struct): `owner`, `name`, `description`, `category`,
`capabilities[]`, `pricingModel` (enum), `protocols[]`, `chains[]`, `metadataURI` (IPFS-ready),
`endpointHash`, `version`, `verified`, `available`, `active`, `registeredAt`, `updatedAt`.

- `available` = agent is temporarily paused/reactivated by its owner (business availability).
- `active` = agent has not been removed (soft delete — the id and history stay resolvable
  forever since escrows/reputation/orchestration reference it).
- `verified` = granted/revoked only by `VERIFIER_ROLE` (an admin or, later, a CROO Agent Store
  curation process).

**Write functions**: `registerAgent`, `updateAgent`, `pauseAgent`, `reactivateAgent`,
`removeAgent`, `transferAgentOwnership`, `verifyAgent` / `revokeVerification` (role-gated),
`pause`/`unpause` (contract-wide emergency stop, admin-gated).

Arrays (`capabilities`, `protocols`, `chains`) are capped at `MAX_ARRAY_LENGTH = 20` entries to
keep gas predictable and prevent storage-bloat griefing.

**Roles**: `DEFAULT_ADMIN_ROLE`, `VERIFIER_ROLE` (OpenZeppelin `AccessControl`). `Pausable` guards
registration/updates only — reads always work.

### 2.2 EscrowCommerce (`contracts/EscrowCommerce.sol`)

Trustless USDC escrow. State machine (see `EscrowStatus` enum):

```
Created ──accept──▶ Accepted ──markCompleted──▶ Completed ──release──▶ Released  (terminal)
   │                    │                            │
   └──cancel──▶ Cancelled (terminal)                  │
   │                    │                            │
   └──timeout──▶ Refunded (terminal) ◀──timeout───────┘ (only from Created/Accepted)
                        │                            │
                        └──dispute──▶ Disputed ──resolve──▶ Resolved (terminal)
```

- **createEscrow**: buyer deposits `amount` USDC via `SafeERC20.safeTransferFrom`, targeting a
  specific `agentId`, `deadline`, and optional `workflowId` (bytes32 correlation id).
- **acceptEscrow**: only the agent's current owner (per `AgentRegistry`) may accept, and only
  before `deadline`.
- **markCompleted**: agent attaches a `completionProofHash` (hash of off-chain execution output).
- **releasePayment**: buyer releases anytime after Completed; the *agent* may also self-release
  after a `RELEASE_GRACE_PERIOD` (3 days) if the buyer goes silent, so funds can never be trapped
  by an unresponsive buyer.
- **cancelEscrow**: buyer-only, only before acceptance.
- **claimTimeoutRefund**: buyer reclaims funds once `deadline` passes with no delivery, whether or
  not the agent had accepted.
- **raiseDispute** / **resolveDispute**: either party freezes the escrow; `ARBITRATOR_ROLE`
  splits funds by any (buyerAmount, agentAmount) pair summing to the original amount.

A protocol fee (`feeBps`, capped at `MAX_FEE_BPS = 10%`, default `0`) is taken only from the
agent's payout on release/dispute-resolution, sent to `feeRecipient`.

**Security properties**:
- Every fund-moving function is `nonReentrant` (OpenZeppelin `ReentrancyGuard`).
- Checks-effects-interactions throughout: `status` flips to its next/terminal value *before* any
  token transfer or external call.
- `SafeERC20` for all transfers (handles non-standard ERC20 return values safely).
- Reputation sync is **best-effort**: wrapped in `try/catch` so a reverting/misconfigured
  Reputation contract can never trap escrowed funds (emits `ReputationSyncFailed` instead).
- `Pausable` blocks new escrow creation/acceptance only — cancel/release/refund/dispute paths on
  *existing* escrows always remain open, so an emergency pause can never freeze user funds.

### 2.3 Reputation (`contracts/Reputation.sol`)

An objective performance ledger, not a star-rating board.

**Storage per agent** (`AgentReputation` struct): `completedJobs`, `successfulJobs`,
`failedJobs`, `totalResponseLatency`, `totalExecutionDuration`, `totalRevenue`, `reviewCount`,
`cumulativeRatingScore`, `reputationScore`, `trustScore`, `verifiedBadge`, `lastActivityAt`.

- Only `RECORDER_ROLE` (granted to the deployed `EscrowCommerce`) may call
  `recordSuccessfulJob` / `recordFailedJob` — always as the direct result of a settled escrow,
  keyed by `escrowId` so the same settlement can never be double-counted
  (`EscrowAlreadyRecorded`).
- `submitReview(escrowId, rating)` lets **only** the buyer of that exact escrow leave one 1–5
  rating, once. Eligibility is set by `EscrowCommerce`'s recorder call, not chosen by the caller.
- **No historical array is stored on-chain.** Only the latest aggregate lives in storage
  (O(1) per agent regardless of job volume); every mutation emits `ReputationUpdated` with the
  full new state, so the backend indexer reconstructs complete history into MongoDB from events.
  This is a deliberate gas/storage tradeoff — see §5.
- Scoring lives in three small, isolated `internal` functions —
  `_computeReputationScore`, `_computeTrustScore`, `_qualifiesForBadge` — operating purely on the
  struct, so a future ML-derived or governance-voted formula can replace them **without any
  storage migration**:
  - `reputationScore` (0–10000 bps): 100% success-rate driven until the first review exists, then
    a 60/40 blend of success rate and average buyer rating.
  - `trustScore`: `reputationScore` dampened by a volume-confidence multiplier that saturates at
    `VOLUME_CONFIDENCE_CAP = 50` completed jobs — a handful of lucky jobs can't outrank a proven
    track record.
  - `verifiedBadge`: auto-granted (no manual gate) once `completedJobs >= 10` **and** success rate
    `>= 95%`.

### 2.4 OrchestrationMetadata (`contracts/OrchestrationMetadata.sol`)

An audit trail, never an execution engine.

- **WorkflowTemplate**: a reusable, *mutable* definition (owner may `updateTemplate` /
  `deactivateTemplate`) — `name`, `metadataURI` (dependency graph reference), `templateHash`,
  `version`.
- **WorkflowExecution**: an *immutable* proof — `templateId` (0 if ad-hoc), `workflowRef`
  (correlates to the backend's MongoDB workflow document id), `participatingAgents[]` (wallet
  addresses), `agentIds[]` (optional `AgentRegistry` ids, validated against the registry when
  non-empty), `executionProofHash`, `completionHash`, `startedAt`/`completedAt`/`recordedAt`,
  `status` (Completed/Failed/Partial). **There is no update or delete function for a recorded
  execution** — immutability by omission, not by convention.
- Duplicate `workflowRef` values are rejected (`DuplicateWorkflowRef`), so a backend workflow
  document can be anchored on-chain exactly once.

---

## 3. Project layout

```
blockchain/
├─ contracts/
│  ├─ AgentRegistry.sol
│  ├─ EscrowCommerce.sol
│  ├─ Reputation.sol
│  ├─ OrchestrationMetadata.sol
│  ├─ interfaces/            IAgentRegistry, IEscrowCommerce, IReputation, IOrchestrationMetadata
│  └─ mocks/MockUSDC.sol     6-decimal test USDC (owner-mint + public faucet())
├─ scripts/
│  ├─ deploy.ts              deploys all 4 contracts in dependency order + wires roles
│  ├─ verify.ts              verifies every deployed contract on Basescan
│  ├─ utils/deploymentStore.ts
│  └─ interact/demo.ts       scripted end-to-end walkthrough against a live deployment
├─ test/                     37 Mocha/Chai tests (AgentRegistry, EscrowCommerce, Reputation,
│                            OrchestrationMetadata, plus a full cross-contract Integration test)
├─ examples/
│  ├─ backend-integration.ts   ethers.js v6 read/index example for the Express backend
│  └─ frontend-integration.tsx wagmi v2 + viem hooks matching the existing Next.js frontend
├─ deployments/<network>.json  addresses + constructor args, written by deploy.ts (gitignored)
├─ hardhat.config.ts
└─ .env.example
```

---

## 4. Getting started

```bash
cd blockchain
npm install
cp .env.example .env        # fill in PRIVATE_KEY, BASESCAN_API_KEY, etc.

npm run compile
npm test                    # 37 tests
npm run test:gas            # same tests + gas usage table

# Local network
npx hardhat node                                  # in one terminal
npm run deploy:localhost                          # in another
npx hardhat run scripts/interact/demo.ts --network localhost

# Base Sepolia
npm run deploy:baseSepolia
npm run verify:baseSepolia
```

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `PRIVATE_KEY` | Deployer key for Base Sepolia/mainnet. Use a dedicated testnet key. |
| `BASE_SEPOLIA_RPC_URL` | Defaults to the public `https://sepolia.base.org`. |
| `BASESCAN_API_KEY` | Required for `verify:baseSepolia`. |
| `USDC_ADDRESS` | Real USDC to wire `EscrowCommerce` to. Leave empty to auto-deploy `MockUSDC`. |
| `FEE_RECIPIENT` | Protocol fee recipient (defaults to admin/deployer). |
| `PROTOCOL_FEE_BPS` | Protocol fee in bps, default `0`, max enforced on-chain `1000` (10%). |
| `ADMIN_ADDRESS` | Receives `DEFAULT_ADMIN_ROLE`/`VERIFIER_ROLE`/`ARBITRATOR_ROLE`. Use a multisig in production; defaults to the deployer. |

`deploy.ts` writes `deployments/<network>.json` with every address and constructor argument,
which `verify.ts` and the interaction/example scripts read back — no addresses are ever
hand-copied between scripts.

---

## 5. Security assumptions & tradeoffs

- **USDC is trusted.** `EscrowCommerce` assumes the configured token is a standard, non-fee-on-
  transfer, non-rebasing ERC20 (true for Circle's USDC). `SafeERC20` handles missing return
  values but not fee-on-transfer semantics — do not point this at a deflationary token.
- **Admin key custody matters.** `DEFAULT_ADMIN_ROLE` can pause registration/escrow-creation,
  change fee config, grant `ARBITRATOR_ROLE`/`VERIFIER_ROLE`, and repoint `Reputation`. It cannot
  drain escrowed funds, alter an escrow's recorded amount, or rewrite reputation history. Use a
  multisig (e.g. Safe) as `ADMIN_ADDRESS` in production.
- **`ARBITRATOR_ROLE` is a centralization point by design for the hackathon MVP.** It can move
  disputed funds by any split. The roadmap (§8) covers replacing single-key arbitration with a
  CROO-governed multisig or on-chain voting without changing `EscrowCommerce`'s external
  interface (`resolveDispute` stays the same; only who can call it changes).
- **Reputation history is event-sourced, not stored.** On-chain storage holds only the latest
  aggregate per agent (O(1)); full history is reconstructed off-chain from `ReputationUpdated`
  events. This bounds gas cost regardless of an agent's job volume, at the cost of requiring an
  indexer for historical dashboards (see §6) — an explicit, documented tradeoff, not an
  oversight.
- **Arrays are length-capped**, not because bounding them is "safe" in a cryptographic sense, but
  to keep gas costs bounded and predictable for `AgentRegistry` (`MAX_ARRAY_LENGTH = 20`) and
  `OrchestrationMetadata` (`MAX_PARTICIPANTS = 50`).
- **No reentrancy across contracts**: `EscrowCommerce`'s calls into `Reputation` happen *after*
  all token transfers and status updates, and are wrapped in `try/catch`, so even a malicious
  `Reputation` implementation cannot re-enter `EscrowCommerce` to double-spend — reentrancy is
  additionally blocked by `nonReentrant` on every fund-moving function regardless.
- **Custom errors, not require-strings**, are used throughout for gas efficiency and precise,
  machine-checkable revert reasons in tests.
- Not yet audited. Treat this as a hackathon-grade MVP foundation, not production-ready for
  mainnet value at scale, until it has gone through a professional audit.

---

## 6. Backend synchronization strategy & MongoDB boundary

**The chain is the source of truth for**: agent ownership, active/available/verified state,
escrow status and fund movement, reputation aggregates, and workflow execution proofs.

**MongoDB is a fast, queryable cache of that truth**, kept current by an event indexer (see
`examples/backend-integration.ts`) — never by independently mutating trust-critical fields
off-chain. Concretely:

| On-chain event | MongoDB effect |
|---|---|
| `AgentRegistered` / `AgentUpdated` | Upsert `Agent` doc keyed by `onChainId` |
| `AgentPaused` / `AgentReactivated` | `Agent.availability = 'offline' \| 'online'` |
| `AgentVerified` / `AgentVerificationRevoked` | `Agent.verification` |
| `EscrowCreated` | Upsert `Transaction` with `status: 'escrow_hold'`, `settlementMethod: 'on_chain_pending'` |
| `PaymentReleased` / `EscrowRefunded` | `Transaction.status = 'completed' \| 'refunded'` |
| `ReputationUpdated` | `Agent.reputationScore`, `Agent.performance.*` |
| `WorkflowExecutionRecorded` | `Workflow.executionProof` (future field, see §8) |

This mapping already lines up with fields that exist today in `backend/src/models/Agent.ts`
(`reputationScore`, `performance.{successRate,averageLatencyMs,completedJobs}`, `verification`,
`availability`) and `backend/src/models/Transaction.ts` (`status`, `settlementMethod:
'on_chain_pending'`, `chainMeta.note`) — those fields were clearly scaffolded in anticipation of
this integration.

**What never happens**: the backend does not accept a client request and silently mark a
`Transaction` as `completed` or bump an `Agent.reputationScore` on its own authority. Every
trust-relevant mutation in MongoDB is a *downstream effect* of a contract event, making the
database rebuildable from chain history at any time (`replay from block 0` recovers full state).

The indexer should run as its own worker process (`backend/src/workers/chainIndexer.ts`,
separate from the request/response Express process), tracking the last-processed block per
contract so it can resume after a restart without missing or double-processing events.

---

## 7. Event flow reference

Every state-changing function emits at least one event; consumers (indexer, frontend, future
subgraph) should never need to poll contract storage to detect a change:

- **AgentRegistry**: `AgentRegistered`, `AgentUpdated`, `AgentPaused`, `AgentReactivated`,
  `AgentRemoved`, `AgentOwnershipTransferred`, `AgentVerified`, `AgentVerificationRevoked`.
- **EscrowCommerce**: `EscrowCreated`, `EscrowAccepted`, `WorkCompleted`, `PaymentReleased`,
  `EscrowRefunded`, `EscrowCancelled`, `EscrowTimedOut`, `DisputeRaised`, `DisputeResolved`,
  plus admin events `ReputationContractUpdated`, `FeeConfigUpdated`, and the diagnostic
  `ReputationSyncFailed`.
- **Reputation**: `ReputationUpdated` (carries the full new aggregate every time),
  `ReviewSubmitted`, `VerifiedBadgeChanged`.
- **OrchestrationMetadata**: `TemplateRegistered`, `TemplateUpdated`, `TemplateDeactivated`,
  `WorkflowExecutionRecorded`.

All identifiers (`agentId`, `escrowId`, `executionId`, `templateId`, `workflowRef`) are `indexed`
where they're the natural lookup key, so `eth_getLogs` filtering works without a full-node
archive scan.

---

## 8. Extensibility roadmap

- **CROO CAP settlement integration**: `EscrowCommerce` already isolates all value-movement
  behind `_payout`/`safeTransfer` calls to a single `IERC20 usdc` immutable. Adding CAP as an
  alternate settlement rail means introducing a `ISettlementAdapter` interface with USDC-escrow
  as the default adapter — `createEscrow`'s external signature does not need to change, only the
  internal payout path gains a second implementation. `workflowId`/`workflowRef` fields already
  exist end-to-end (escrow → orchestration) as the correlation point CAP would key off.
- **CROO Agent Store registration**: `AgentRegistry.AgentInput` is already the exact struct the
  Store would submit — the Store becomes just another caller of `registerAgent`/`updateAgent`
  (optionally from a Store-operated relayer wallet paying gas on behalf of creators), and
  `VERIFIER_ROLE` becomes the Store's curation/verification authority. No new fields or migration
  required.
- **Governance-based dispute resolution**: `ARBITRATOR_ROLE` is a standard OpenZeppelin
  `AccessControl` role. Swapping a single admin key for a Safe multisig or an on-chain voting
  contract is a `grantRole`/`revokeRole` operation, not a contract upgrade.
  Reputation scoring is likewise contained in three `internal` pure functions
  (`_computeReputationScore`, `_computeTrustScore`, `_qualifiesForBadge`) specifically so an
  ML-derived or DAO-voted formula can replace them without touching `AgentReputation` storage.
- **Subgraph / off-chain indexing**: every event is fully self-describing (see §7), so a
  TheGraph subgraph or a lightweight custom indexer are both drop-in options alongside the
  MongoDB sync path in §6 without any contract changes.
- **Upgradeability**: contracts are intentionally deployed as plain (non-proxy) contracts for
  this MVP, since the immutability of `EscrowCommerce`/`Reputation`/`OrchestrationMetadata` is
  itself part of the trust story. If upgradeability becomes necessary, `AgentRegistry` is the
  best candidate for a UUPS proxy first (identity metadata evolves fastest); escrow/reputation
  should stay non-upgradeable or move to a documented migration pattern (deploy v2, point new
  activity at it, keep v1 readable forever) rather than a proxy, to preserve the "funds contract
  logic never silently changes underneath you" guarantee.

---

## 9. Testing

```bash
npm test          # 37 tests across 5 files, ~10s
npm run test:gas  # same, plus a gas usage table (see below)
```

Coverage includes: full lifecycle happy paths, every custom error/revert path, role-gated access
control, pausability (and that pausing never blocks fund *exits*), reentrancy-safe fee math,
timeout/grace-period edge cases, dispute splits (including invalid-split rejection), array-length
and duplicate-reference guards, and a full cross-contract integration test exercising all four
contracts in one flow (register → escrow → settle → reputation → review → workflow proof).

Representative gas costs (Base Sepolia, optimizer 200 runs):

| Operation | Gas |
|---|---|
| `AgentRegistry.registerAgent` | ~557k (first-time storage of all arrays) |
| `AgentRegistry.updateAgent` | ~93k |
| `EscrowCommerce.createEscrow` | ~235–255k |
| `EscrowCommerce.acceptEscrow` | ~115k |
| `EscrowCommerce.releasePayment` | ~78–384k (includes Reputation sync) |
| `Reputation.recordSuccessfulJob` | ~152–291k |
| `OrchestrationMetadata.recordExecution` | ~406–447k (scales with participant count) |

Full contract deployment costs 4.4% / 3.2% / 2.8% / 1.5% of a 60M-gas block for
AgentRegistry/EscrowCommerce/OrchestrationMetadata/Reputation respectively — all four fit
comfortably within any single Base block together.
