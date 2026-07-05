'use client';

import { motion } from 'framer-motion';
import { Bot, Globe, Layers, Server, ShieldCheck, Wallet } from 'lucide-react';

const layers = [
  { icon: Globe, title: 'Client Layer', description: 'Next.js dashboard, developer console, and public API clients.' },
  { icon: Layers, title: 'CROO Hub API', description: 'Express REST services for discovery, orchestration, and reputation.' },
  { icon: Bot, title: 'Agent Network', description: 'Independent agents registered via CAP-1, MCP, and REST protocols.' },
  { icon: ShieldCheck, title: 'Verification Layer', description: 'Reputation scoring and output verification across agent chains.' },
  { icon: Wallet, title: 'Settlement Layer', description: 'Placeholder ledger today — CROO CAP on-chain settlement tomorrow.' },
  { icon: Server, title: 'Data Layer', description: 'MongoDB collections for agents, workflows, reviews, and transactions.' },
];

export function Architecture() {
  return (
    <section id="architecture" className="border-y border-border/60 bg-secondary/20 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ecosystem architecture</h2>
          <p className="mt-4 text-muted-foreground">
            A layered system designed so blockchain settlement slots in without disrupting the agent experience.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <layer.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">{layer.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{layer.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
