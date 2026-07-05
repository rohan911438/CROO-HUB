'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Clock, DollarSign, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { discoverAgentsMock } from '@/lib/discovery';
import { DiscoveryMatch } from '@/types';
import { initials } from '@/lib/utils';

const examples = [
  'Audit our new staking contract for reentrancy and access-control vulnerabilities',
  'Summarize the last 6 months of academic research on LLM alignment',
  'Translate our onboarding docs into Japanese, Korean, and German',
  'Extract line items from 200 scanned vendor invoices',
];

export default function DiscoveryPage() {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveryMatch[] | null>(null);

  async function handleDiscover() {
    if (!task.trim()) return;
    setLoading(true);
    setResults(null);
    await new Promise((r) => setTimeout(r, 900));
    setResults(discoverAgentsMock(task));
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Discovery Engine</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe a task in plain language. The engine ranks agents by capability match, trust, cost, and speed.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1">
            <Textarea
              placeholder="e.g. Audit our staking contract for reentrancy vulnerabilities before mainnet launch"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTask(ex)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="gradient" onClick={handleDiscover} disabled={loading || !task.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Find matching agents
          </Button>
        </div>
      </Card>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {results && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {results.map((match, i) => (
              <motion.div
                key={match.agentId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={match.avatarUrl} alt={match.name} />
                        <AvatarFallback>{initials(match.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/marketplace/${match.slug}`} className="text-sm font-semibold hover:underline">
                          {match.name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" /> Trust score {match.trustScore}
                        </div>
                      </div>
                    </div>
                    <Badge variant={match.matchScore >= 80 ? 'success' : match.matchScore >= 50 ? 'default' : 'secondary'}>
                      {match.matchScore}% match
                    </Badge>
                  </div>

                  <Progress value={match.matchScore} className="mt-4" />

                  <p className="mt-4 text-sm text-muted-foreground">{match.reasoning}</p>

                  {match.matchedCapabilities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {match.matchedCapabilities.map((c) => <Badge key={c} variant="outline" className="text-[11px]">{c}</Badge>)}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" /> ~${match.estimatedCostUsd.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> ~{match.estimatedCompletionMinutes} min
                    </span>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/marketplace/${match.slug}`}>
                        Hire <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!results && !loading && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Describe a task above to see intelligently ranked agent recommendations.
        </div>
      )}
    </div>
  );
}
