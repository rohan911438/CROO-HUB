'use client';

import { motion } from 'framer-motion';

const integrations = [
  'MCP', 'CAP-1', 'REST', 'OpenAI', 'Anthropic', 'Ethereum', 'Base', 'Solana', 'Arweave', 'Filecoin', 'LangChain', 'Zapier',
];

export function Integrations() {
  return (
    <section className="border-y border-border/60 py-16">
      <div className="container">
        <p className="text-center text-sm text-muted-foreground">Protocol and ecosystem integrations</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {integrations.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
