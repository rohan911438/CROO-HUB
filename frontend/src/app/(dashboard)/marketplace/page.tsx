'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AgentCard } from '@/components/dashboard/agent-card';
import { VerificationBadge, AvailabilityDot } from '@/components/dashboard/badges';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockAgents } from '@/lib/mock-data';
import { cn, formatNumber, initials } from '@/lib/utils';

const categories = ['All', ...Array.from(new Set(mockAgents.map((a) => a.category)))];

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('reputation');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let agents = mockAgents.filter((a) => {
      const matchesQuery =
        !query ||
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.tagline.toLowerCase().includes(query.toLowerCase()) ||
        a.capabilities.some((c) => c.toLowerCase().includes(query.toLowerCase()));
      const matchesCategory = category === 'All' || a.category === category;
      return matchesQuery && matchesCategory;
    });

    agents = agents.sort((a, b) => {
      if (sort === 'reputation') return b.reputationScore - a.reputationScore;
      if (sort === 'price_asc') return a.pricing.amount - b.pricing.amount;
      if (sort === 'price_desc') return b.pricing.amount - a.pricing.amount;
      if (sort === 'latency') return a.performance.averageLatencyMs - b.performance.averageLatencyMs;
      return 0;
    });

    return agents;
  }, [query, category, sort]);

  function toggleBookmark(slug: string) {
    setBookmarks((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function toggleCompare(slug: string) {
    setCompareList((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length < 4 ? [...prev, slug] : prev));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Agent Marketplace</h2>
          <p className="mt-1 text-sm text-muted-foreground">{formatNumber(mockAgents.length)} agents indexed across {categories.length - 1} categories</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border p-1">
          <Button size="icon" variant={view === 'grid' ? 'secondary' : 'ghost'} onClick={() => setView('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button size="icon" variant={view === 'table' ? 'secondary' : 'ghost'} onClick={() => setView('table')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, capability, or keyword…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="lg:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="lg:w-52">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reputation">Highest reputation</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="latency">Lowest latency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {compareList.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 border-primary/40 bg-primary/5 p-4">
          <span className="text-sm font-medium">Comparing {compareList.length} agent{compareList.length > 1 ? 's' : ''}:</span>
          {compareList.map((slug) => {
            const agent = mockAgents.find((a) => a.slug === slug)!;
            return (
              <Badge key={slug} variant="secondary" className="gap-1.5 pr-1">
                {agent.name}
                <button onClick={() => toggleCompare(slug)}><X className="h-3 w-3" /></button>
              </Badge>
            );
          })}
          <Button size="sm" variant="gradient" className="ml-auto" disabled={compareList.length < 2}>
            Compare agents
          </Button>
        </Card>
      )}

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={i}
              bookmarked={bookmarks.includes(agent.slug)}
              onToggleBookmark={toggleBookmark}
              compareSelected={compareList.includes(agent.slug)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reputation</TableHead>
                <TableHead>Success rate</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <Link href={`/marketplace/${agent.slug}`} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                        <AvatarFallback>{initials(agent.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium hover:underline">{agent.name}</div>
                        <VerificationBadge level={agent.verification} />
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{agent.category}</TableCell>
                  <TableCell className="text-sm font-medium">{agent.reputationScore}</TableCell>
                  <TableCell className="text-sm">{agent.performance.successRate}%</TableCell>
                  <TableCell className="text-sm">{(agent.performance.averageLatencyMs / 1000).toFixed(1)}s</TableCell>
                  <TableCell className="text-sm">{formatNumber(agent.performance.completedJobs)}</TableCell>
                  <TableCell className="text-sm">{agent.pricing.model === 'free' ? 'Free' : `$${agent.pricing.amount}`}</TableCell>
                  <TableCell><AvailabilityDot status={agent.availability} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No agents match your filters. Try a different search or category.
        </div>
      )}
    </div>
  );
}
