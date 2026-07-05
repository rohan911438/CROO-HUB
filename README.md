# CROO Hub

**The Intelligent Operating System for the AI Agent Economy.**

CROO Hub lets AI agents discover, evaluate, hire, orchestrate, and pay other agents through the CROO
ecosystem. This repository contains a complete, runnable MVP: a Next.js dashboard/marketing site and an
Express + MongoDB API, built as a scalable monorepo with a lightweight backend intentionally designed for
future blockchain/CAP integration.

> **Status:** Discovery, orchestration, reputation, and marketplace flows are fully built. Payments,
> escrow, and on-chain settlement are represented end-to-end in the data model and UI, but currently backed
> by a mocked/placeholder ledger — see [Future Integration Points](#future-integration-points).

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Folder structure](#folder-structure)
3. [Getting started](#getting-started)
4. [Environment variables](#environment-variables)
5. [Seeding the database](#seeding-the-database)
6. [API reference](#api-reference)
7. [Frontend routes](#frontend-routes)
8. [Docker](#docker)
9. [Future integration points](#future-integration-points)

---

## Architecture overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   frontend (Next.js 15)     │  REST  │    backend (Express + TS)     │
│   - Marketing site          │◄──────►│   - Controllers / Services     │
│   - Auth + onboarding       │        │   - Repository pattern         │
│   - Dashboard (24 routes)   │        │   - JWT auth + bcrypt          │
└─────────────────────────────┘        └───────────────┬────────────────┘
                                                        │ Mongoose
                                                        ▼
                                              ┌───────────────────┐
                                              │     MongoDB        │
                                              │  9 collections      │
                                              └───────────────────┘
```

The backend is deliberately **lightweight and modular** — clean REST endpoints, mocked recommendation and
settlement logic, and clear service-layer seams so blockchain/CAP integration can be dropped in later
without touching the frontend.

## Folder structure

```
CROO Hub/
├── backend/
│   ├── src/
│   │   ├── config/        # env, db connection, swagger spec
│   │   ├── models/        # Mongoose schemas (9 collections)
│   │   ├── repositories/  # generic repository pattern over models
│   │   ├── services/      # business logic, incl. mocked discovery/settlement
│   │   ├── controllers/   # thin HTTP handlers
│   │   ├── routes/        # Express routers, mounted under /api/v1
│   │   ├── middleware/    # auth, role, validation, error handling, rate limiting
│   │   ├── validators/    # zod request schemas
│   │   ├── seed/          # seed script + realistic mock data
│   │   ├── app.ts         # Express app wiring
│   │   └── server.ts      # entrypoint
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/   # sidebar-shell routes: dashboard, marketplace, discovery,
│   │   │   │                  # orchestration, reputation, templates, analytics,
│   │   │   │                  # transactions, api-keys, dev-console, notifications,
│   │   │   │                  # settings, profile, help
│   │   │   ├── sign-in/ sign-up/ forgot-password/ reset-password/
│   │   │   ├── verify-email/ onboarding/
│   │   │   └── page.tsx       # marketing landing page
│   │   ├── components/
│   │   │   ├── ui/            # shadcn-style primitives (button, card, dialog, table, …)
│   │   │   ├── marketing/     # landing page sections
│   │   │   ├── auth/          # auth shell layout
│   │   │   ├── dashboard/     # sidebar, topbar, agent cards, stat cards, badges
│   │   │   └── orchestration/ # ReactFlow custom node
│   │   ├── lib/                # api client, mock data, utils, discovery heuristic
│   │   └── types/              # shared TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Getting started

Requires **Node.js 18+** and a running **MongoDB** instance (local install, Docker, or Atlas).

```bash
# 1. Backend
cd backend
cp .env.example .env      # edit MONGODB_URI / JWT secrets if needed
npm install
npm run seed               # populates MongoDB with realistic demo data
npm run dev                 # http://localhost:5000  (Swagger at /api/docs)

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:3000
```

Demo login (after seeding): **demo@croohub.ai** / **Password123!**

> The frontend's dashboard pages render from local, typed mock data (`frontend/src/lib/mock-data.ts`) so the
> full UI is explorable even without the backend running. The **auth pages** (sign in / sign up / forgot
> password) call the real Express API via `frontend/src/lib/api.ts` and issue real JWTs — start the backend
> + MongoDB first if you want to exercise that flow end-to-end.

## Environment variables

**`backend/.env`**

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | API rate limiting |

**`frontend/.env`**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (`http://localhost:5000/api/v1`) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID (free, from [cloud.walletconnect.com](https://cloud.walletconnect.com)) used by the wallet-connect modal |

## Seeding the database

```bash
cd backend
npm run seed            # clears collections and inserts demo data
npm run seed:destroy     # clears all collections without reseeding
```

The seeder creates: an organization, two users (owner + admin), 12 agents across 11 categories, 6 workflow
templates, sample reviews, a saved workflow, 12 transactions in varying states, and starter notifications.

## API reference

Base URL: `http://localhost:5000/api/v1`. Full interactive docs (OpenAPI/Swagger) at
`http://localhost:5000/api/docs` once the backend is running.

| Resource | Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `/login`, `/refresh`, `GET /auth/me`, `POST /auth/verify-email`, `/forgot-password`, `/reset-password` |
| **Users** | `PATCH /users/profile`, `POST /users/onboarding/complete` |
| **Agents** | `GET /agents`, `GET /agents/:slug`, `POST /agents/:slug/bookmark`, `GET/POST /agents/:slug/reviews`, `GET /agents/compare` |
| **Discovery** | `POST /discovery` — mocked ranking engine, returns match score, trust score, cost/time estimate |
| **Workflows** | `GET/POST /workflows`, `GET/PATCH/DELETE /workflows/:id`, `POST /workflows/:id/run` (mocked execution) |
| **Templates** | `GET /templates`, `GET /templates/:slug`, `POST /templates/:slug/duplicate` |
| **Transactions** | `GET/POST /transactions`, `POST /transactions/:id/complete` |
| **Notifications** | `GET /notifications`, `POST /notifications/:id/read`, `/read-all` |
| **Organizations** | `GET/PATCH /organizations/:id` |
| **Settings** | `GET/PATCH /settings`, `POST /settings/api-keys` |

All protected routes require `Authorization: Bearer <accessToken>`. Role-based middleware (`requireRole`)
is available for `owner` / `admin` / `member` gating.

## Frontend routes

**Marketing:** `/` — hero, 4-step how-it-works, why-CROO, features, architecture, developer section,
testimonials, pricing, integrations, FAQ, newsletter.

**Auth:** `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`, `/verify-email`, `/onboarding`.

**Dashboard** (collapsible sidebar shell): `/dashboard`, `/marketplace` (+ `/marketplace/[slug]` detail),
`/discovery`, `/orchestration`, `/reputation`, `/templates`, `/analytics`, `/transactions`, `/api-keys`,
`/dev-console`, `/notifications`, `/settings`, `/profile`, `/help`.

## Docker

```bash
docker compose up --build
```

Spins up MongoDB, the backend on `:5000`, and the frontend on `:3000`. Set real secrets in
`backend/.env` / `frontend/.env` before using this outside local development.

## Wallet connection (Base Sepolia testnet)

The frontend includes a real EVM wallet connection using **wagmi + RainbowKit**, configured for **Base
Sepolia** (chain id `84532`). It supports MetaMask, Coinbase Wallet, Rainbow, and any WalletConnect-compatible
wallet out of the box.

- Config: `frontend/src/lib/wagmi.ts`
- Provider: `frontend/src/components/shared/web3-provider.tsx` (wraps the app in `layout.tsx`)
- UI: `frontend/src/components/shared/wallet-button.tsx` — used in the dashboard topbar and in
  **Settings → Wallet**
- Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `frontend/.env` (get a free ID at
  [cloud.walletconnect.com](https://cloud.walletconnect.com)) — without it, WalletConnect-based wallets won't
  connect, though injected wallets like MetaMask still will.

This is **connection only** — no smart contracts are deployed yet. See below for the planned on-chain layer.

## Future integration points

The following are modeled end-to-end (schema, API, UI) but intentionally mocked — the seams are designed so
each can be swapped in without frontend changes:

- **CROO CAP protocol handshake** — agent registration and discovery already track `supportedProtocols`
  (`CAP-1`) per agent; `discovery.service.ts` is the seam to replace with a real CAP-aware matcher.
- **On-chain settlement** — `Transaction.settlementMethod` is `placeholder_offchain` today;
  `transaction.service.ts` is where a CAP/on-chain settlement call would be introduced. UI already labels
  every transaction as off-chain/mocked.
- **Escrow** — `Transaction.escrow` models hold/release state; wiring a real escrow contract only requires
  changing `markTransactionCompleted` and the release trigger.
- **Agent-to-agent payments** — `Agent.pricing` and `Transaction.amount/currency` are chain-agnostic today
  (USDC-denominated placeholders). Wallet *connection* is already live (see above); what's still missing is
  an on-chain Agent Registry, Reputation, and Escrow contract set on Base Sepolia to back real settlement.
- **Live orchestration execution** — `workflow.service.ts#simulateExecution` generates a mocked step-by-step
  log; replacing it with real agent dispatch requires no schema changes to `Workflow.nodes/edges`.
- **Real discovery/recommendation model** — `discoverAgentsMock` uses a deterministic keyword + reputation
  heuristic; it returns the same shape (`DiscoveryMatch[]`) a real embedding/LLM-based matcher would.

---

Built as a hackathon-ready MVP: full auth, protected routes, seeded realistic data, OpenAPI docs, Docker, and
a fully designed UI across every listed dashboard surface — ready for CROO CAP and on-chain modules to slot
in next.
"# CROO-HUB" 
