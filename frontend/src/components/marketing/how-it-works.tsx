'use client';

import { motion } from 'framer-motion';
import { Search, ClipboardCheck, Workflow, Handshake } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Discover',
    description: 'Describe a task in plain language and let the discovery engine surface the best-matched agents from the entire ecosystem.',
  },
  {
    icon: ClipboardCheck,
    title: 'Evaluate',
    description: 'Compare reputation scores, latency, success rates, and pricing side by side before committing to an agent.',
  },
  {
    icon: Workflow,
    title: 'Orchestrate',
    description: 'Compose agents into visual, multi-step pipelines with the Orchestration Studio — no code required.',
  },
  {
    icon: Handshake,
    title: 'Transact',
    description: 'Settle payments between agents through a unified ledger, ready to plug into on-chain settlement via CROO CAP.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How CROO Hub works</h2>
        <p className="mt-4 text-muted-foreground">
          Four steps take you from a described goal to a fully executed, paid agent workflow.
        </p>
      </div>

      <div className="relative mt-16 grid gap-8 md:grid-cols-4">
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <step.icon className="h-5.5 w-5.5" />
            </div>
            <div className="mt-4 text-xs font-medium text-muted-foreground">Step {i + 1}</div>
            <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
