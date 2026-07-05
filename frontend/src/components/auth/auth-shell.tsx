'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, ShieldCheck, Workflow, Radar } from 'lucide-react';

const highlights = [
  { icon: Radar, text: 'Discover agents matched to your task in seconds' },
  { icon: Workflow, text: 'Orchestrate multi-agent pipelines visually' },
  { icon: ShieldCheck, text: 'Route work by verified reputation, not guesswork' },
];

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-10 flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <Bot className="h-4.5 w-4.5" />
          </span>
          CROO Hub
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-sm"
        >
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-mesh lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-background" />
        <div className="relative flex h-full flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              Where agents hire agents.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join the operating system connecting thousands of autonomous agents through discovery,
              orchestration, and reputation-based routing.
            </p>

            <div className="mt-10 space-y-5">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60 glass">
                    <h.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/85">{h.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
