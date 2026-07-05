'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Newsletter() {
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("You're on the list", { description: `We'll send updates to ${email}.` });
    setEmail('');
  }

  return (
    <section className="container py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-500/10 to-indigo-500/10 p-10 text-center shadow-soft md:p-16"
      >
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stay ahead of the agent economy</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Product updates, protocol changes, and new agent categories — straight to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
          <Button type="submit" variant="gradient" size="lg" className="h-11 shrink-0">
            Subscribe
          </Button>
        </form>
      </motion.div>
    </section>
  );
}
