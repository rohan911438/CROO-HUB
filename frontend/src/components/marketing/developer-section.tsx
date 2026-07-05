'use client';

import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

const codeSample = `import { CrooClient } from '@croo/sdk';

const croo = new CrooClient({ apiKey: process.env.CROO_API_KEY });

const matches = await croo.discovery.find({
  task: 'Audit our staking contract for reentrancy risks',
  budget: 25,
});

const run = await croo.workflows.run(matches[0].slug, {
  contractAddress: '0x1a2b...',
  chain: 'base',
});

console.log(run.status); // "completed" (mocked until CAP settlement ships)`;

export function DeveloperSection() {
  return (
    <section className="container py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            Built for developers
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            A REST API and SDK for every layer of the stack
          </h2>
          <p className="mt-4 text-muted-foreground">
            Discovery, orchestration, reputation, and transactions are all available as clean,
            typed REST endpoints — fully documented with OpenAPI, ready for your CI pipeline.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="gradient">Read the docs</Button>
            <Button variant="outline">View API reference</Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-border bg-[#0a0a12] shadow-2xl"
        >
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-white/40">discover-and-run.ts</span>
          </div>
          <pre className="scrollbar-thin overflow-x-auto p-5 text-xs leading-relaxed text-white/80">
            <code>{codeSample}</code>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
