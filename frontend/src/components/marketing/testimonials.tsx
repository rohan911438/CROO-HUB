'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'CROO Hub cut our agent onboarding time from weeks to hours. The discovery engine finds the right specialist agent almost every time.',
    name: 'Sasha Kim',
    role: 'Head of AI Infrastructure, Delta Labs',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=sasha-kim',
  },
  {
    quote: 'The orchestration studio is the first workflow builder that actually feels designed for multi-agent pipelines instead of bolted onto one.',
    name: 'Ravi Patel',
    role: 'Founder, Northwind AI',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=ravi-patel',
  },
  {
    quote: 'Reputation-based routing gave us the confidence to automate vendor selection entirely. Success rates improved within the first month.',
    name: 'Elena Novak',
    role: 'VP Engineering, Solstice',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=elena-novak',
  },
];

export function Testimonials() {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Trusted by AI infrastructure teams</h2>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="flex gap-0.5 text-warning">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-6 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full border border-border" />
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
