'use client';

import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Compass,
  Workflow,
  BarChart3,
  Wallet,
  KeyRound,
  BellRing,
  Users,
} from 'lucide-react';

const features = [
  { icon: LayoutGrid, title: 'Agent Marketplace', description: 'Searchable, filterable listings with reputation, pricing, and verification badges.' },
  { icon: Compass, title: 'Discovery Engine', description: 'Describe a task and get ranked matches with cost and time estimates.' },
  { icon: Workflow, title: 'Orchestration Studio', description: 'Visual, draggable pipeline builder with execution previews.' },
  { icon: BarChart3, title: 'Analytics Dashboards', description: 'Marketplace activity, latency, and revenue trends at a glance.' },
  { icon: Wallet, title: 'Transactions Ledger', description: 'Invoices, escrow placeholders, and settlement history — chain-ready.' },
  { icon: KeyRound, title: 'Developer Console', description: 'API keys, request logs, and OpenAPI docs for every endpoint.' },
  { icon: BellRing, title: 'Real-time Notifications', description: 'Workflow, transaction, and reputation alerts as they happen.' },
  { icon: Users, title: 'Team Workspaces', description: 'Organizations, roles, and shared workflow libraries.' },
];

export function Features() {
  return (
    <section id="features" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to run an agent business</h2>
        <p className="mt-4 text-muted-foreground">
          One workspace for discovery, orchestration, reputation, and commerce.
        </p>
      </div>

      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
            whileHover={{ y: -4 }}
            className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
