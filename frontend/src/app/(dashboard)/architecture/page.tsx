'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import {
  Globe, Wallet, Server, Database, Workflow, Compass, ShieldCheck, Link2, Network, Store, LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { LayerCategory } from '@/components/architecture/layer-node';

const ArchitectureDiagram = dynamic(
  () => import('@/components/architecture/architecture-diagram').then((m) => m.ArchitectureDiagram),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

interface LayerInfo {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  category: LayerCategory;
  position: { x: number; y: number };
  description: string;
}

const LAYERS: LayerInfo[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    sublabel: 'Next.js 15 dashboard',
    icon: Globe,
    category: 'client',
    position: { x: 0, y: 0 },
    description:
      'React + Tailwind + shadcn/ui dashboard. Talks to the backend over a JSON REST API with JWT bearer auth for everything except direct on-chain actions (agents, orders, discovery, CAP status, reputation).',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    sublabel: 'wagmi / RainbowKit',
    icon: Wallet,
    category: 'client',
    position: { x: 260, y: 0 },
    description:
      "The user's own browser wallet, connected via RainbowKit, signs transactions directly against CROO Hub's own deployed contracts (AgentRegistry, EscrowCommerce) on Base Sepolia. This is separate from CAP's own account-abstraction wallets, which CROO Network manages on the user's behalf after Agent Store registration.",
  },
  {
    id: 'backend',
    label: 'Backend API',
    sublabel: 'Express + TypeScript',
    icon: Server,
    category: 'application',
    position: { x: 0, y: 160 },
    description:
      "REST API on Express with JWT access/refresh auth, Zod validation, and rate limiting. Hosts the Planner, Discovery Engine, CAP adapter, and on-chain anchoring client. Holds its own dedicated Base Sepolia signer for anchoring - it never touches a user's private key.",
  },
  {
    id: 'planner',
    label: 'Planner Agent',
    sublabel: 'Coordinator, not executor',
    icon: Workflow,
    category: 'application',
    position: { x: 260, y: 160 },
    description:
      'Given a task, the Planner calls the Discovery Engine to rank candidate agents, hands off to a live-or-simulated CAP executor, then records the outcome into MongoDB and (best-effort) anchors an execution proof on-chain. It never talks to CAP or the chain directly - both are swappable adapters behind it.',
  },
  {
    id: 'discovery',
    label: 'Discovery Engine',
    sublabel: 'Heuristic ranking',
    icon: Compass,
    category: 'application',
    position: { x: 520, y: 160 },
    description:
      'A real, MongoDB-backed heuristic ranking engine: keyword overlap + reputation + success rate + latency. The same engine powers both the standalone Discovery page and the Planner\'s candidate selection - one source of truth, not two duplicated implementations.',
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    sublabel: 'Mongoose models',
    icon: Database,
    category: 'data',
    position: { x: 0, y: 320 },
    description:
      'Agent, AgentOrder, Transaction, Workflow, Template, Review, User, Organization, Notification, Setting. The fast, queryable read/write layer for everything that does not need blockchain-level trust guarantees. Every trust-critical mutation here is a downstream effect of a chain event or a Planner-recorded outcome, never an arbitrary write.',
  },
  {
    id: 'contracts',
    label: 'Smart Contracts',
    sublabel: 'Solidity, Base Sepolia',
    icon: ShieldCheck,
    category: 'trust',
    position: { x: 260, y: 320 },
    description:
      "AgentRegistry, EscrowCommerce, Reputation, and OrchestrationMetadata - CROO Hub's own deployed contracts. Provide decentralized identity, trustless USDC escrow, immutable reputation, and workflow execution proofs, independent of any third party. See blockchain/README.md.",
  },
  {
    id: 'basesepolia',
    label: 'Base Sepolia',
    sublabel: 'L2 testnet',
    icon: Link2,
    category: 'trust',
    position: { x: 520, y: 320 },
    description:
      'All four CROO Hub contracts are live here (blockchain/deployments/baseSepolia.json). Chosen as a working, verifiable, low-cost demo environment - CAP itself only exists on Base mainnet today, which is a deliberate, documented network split, not an oversight.',
  },
  {
    id: 'cap',
    label: 'CAP / CROO Network',
    sublabel: '@croo-network/sdk',
    icon: Network,
    category: 'external',
    position: { x: 130, y: 480 },
    description:
      'The real, external, live CROO Agent Protocol on Base mainnet, integrated via the official @croo-network/sdk. Handles negotiation, escrow (CAPVault), and settlement for agents registered on the CROO Agent Store. CROO Hub is a client of this protocol, not a reimplementation of it.',
  },
  {
    id: 'crooagentstore',
    label: 'CROO Agent Store',
    sublabel: 'agent.croo.network',
    icon: Store,
    category: 'external',
    position: { x: 390, y: 480 },
    description:
      "CROO Network's own hosted marketplace, where CAP-native agents get discovered by other CAP agents. CROO Hub does not replace this - it's a client of it (see the CROO Integration dashboard for guided registration), and it runs its own independent, complementary Discovery Engine over CROO Hub's own agent roster.",
  },
];

const EDGES: { source: string; target: string; label?: string; dashed?: boolean }[] = [
  { source: 'frontend', target: 'backend', label: 'REST + JWT' },
  { source: 'frontend', target: 'wallet', label: 'connect' },
  { source: 'wallet', target: 'contracts', label: 'signed tx' },
  { source: 'backend', target: 'mongodb', label: 'Mongoose' },
  { source: 'backend', target: 'planner' },
  { source: 'planner', target: 'discovery', label: 'rank candidates' },
  { source: 'planner', target: 'cap', label: 'negotiate/pay/deliver' },
  { source: 'planner', target: 'contracts', label: 'anchor proof' },
  { source: 'contracts', target: 'basesepolia', label: 'deployed on' },
  { source: 'cap', target: 'crooagentstore', label: 'registration + discovery' },
  { source: 'crooagentstore', target: 'discovery', label: 'complements, not replaces', dashed: true },
];

const CATEGORY_LEGEND: { category: LayerCategory; label: string }[] = [
  { category: 'client', label: 'Client layer' },
  { category: 'application', label: 'Application layer' },
  { category: 'data', label: 'Data layer' },
  { category: 'trust', label: 'On-chain trust layer' },
  { category: 'external', label: 'External CROO Network' },
];

export default function ArchitecturePage() {
  const [selectedId, setSelectedId] = useState<string>('planner');
  const selected = LAYERS.find((l) => l.id === selectedId) ?? LAYERS[0];

  const nodes: Node[] = useMemo(
    () =>
      LAYERS.map((l) => ({
        id: l.id,
        type: 'layer',
        position: l.position,
        data: { label: l.label, sublabel: l.sublabel, icon: l.icon, category: l.category, selected: l.id === selectedId },
        draggable: false,
      })),
    [selectedId],
  );

  const edges: Edge[] = useMemo(
    () =>
      EDGES.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label,
        labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
        labelBgStyle: { fill: 'hsl(var(--background))' },
        style: {
          stroke: e.dashed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
          strokeWidth: 1.5,
          strokeDasharray: e.dashed ? '4 4' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: e.dashed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))' },
      })),
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Architecture</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How CROO Hub&apos;s frontend, backend, MongoDB, Planner, Discovery Engine, deployed smart contracts, and the
          external CROO Network (CAP) fit together. Click any node for details.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {CATEGORY_LEGEND.map((l) => (
          <Badge key={l.category} variant="outline" className="gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                { client: 'bg-sky-500', application: 'bg-primary', data: 'bg-emerald-500', trust: 'bg-amber-500', external: 'bg-fuchsia-500' }[
                  l.category
                ]
              }`}
            />
            {l.label}
          </Badge>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="h-[560px]">
          <ArchitectureDiagram nodes={nodes} edges={edges} onNodeClick={setSelectedId} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <selected.icon className="h-4 w-4" /> {selected.label}
          </CardTitle>
          <CardDescription>{selected.sublabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{selected.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
