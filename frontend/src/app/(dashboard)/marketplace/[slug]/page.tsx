'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Bookmark, Star, CheckCircle2, Clock, Zap, ArrowLeft, Copy, ExternalLink, Puzzle, Server, GitCommitHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { VerificationBadge, AvailabilityDot } from '@/components/dashboard/badges';
import { mockAgents, mockReviews, reputationHistory } from '@/lib/mock-data';
import { cn, formatNumber, initials } from '@/lib/utils';
import { toast } from 'sonner';

const AgentPerformanceCharts = dynamic(
  () => import('@/components/marketplace/agent-performance-charts').then((m) => m.AgentPerformanceCharts),
  {
    ssr: false,
    loading: () => (
      <>
        <Card><CardContent className="h-64 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
        <Card><CardContent className="h-64 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      </>
    ),
  },
);

export default function AgentDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const agent = mockAgents.find((a) => a.slug === params.slug);
  const [bookmarked, setBookmarked] = useState(false);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium">Agent not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/marketplace')}>
          Back to marketplace
        </Button>
      </div>
    );
  }

  const reviews = mockReviews[agent.slug] ?? [];
  const pricingHistory = reputationHistory.map((r, i) => ({
    month: r.month,
    price: Number((agent.pricing.amount * (0.85 + i * 0.015)).toFixed(3)),
  }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/marketplace')}>
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Button>

      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={agent.avatarUrl} alt={agent.name} />
              <AvatarFallback>{initials(agent.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{agent.name}</h1>
                <VerificationBadge level={agent.verification} />
                <AvailabilityDot status={agent.availability} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{agent.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.capabilities.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="icon" onClick={() => setBookmarked(!bookmarked)}>
              <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-primary text-primary')} />
            </Button>
            <Button variant="outline" onClick={() => toast.info('Integration coming soon', { description: 'Programmatic integration will be enabled once CAP-1 handshake is live.' })}>
              <Puzzle className="h-4 w-4" /> Integrate
            </Button>
            <Button variant="gradient" onClick={() => toast.success('Hire request sent', { description: `${agent.name} has been queued for your next workflow.` })}>
              <Zap className="h-4 w-4" /> Hire agent
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
          <Metric icon={Star} label="Reputation" value={agent.reputationScore.toString()} />
          <Metric icon={CheckCircle2} label="Success rate" value={`${agent.performance.successRate}%`} />
          <Metric icon={Clock} label="Avg latency" value={`${(agent.performance.averageLatencyMs / 1000).toFixed(1)}s`} />
          <Metric icon={Zap} label="Completed jobs" value={formatNumber(agent.performance.completedJobs)} />
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="api">API & Docs</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{agent.description}</p>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <InfoList title="Tools" items={agent.tools} />
                <InfoList title="MCP servers" items={agent.mcpServers} />
                <InfoList title="Protocols" items={agent.supportedProtocols} />
                <InfoList title="Chains" items={agent.supportedChains.length ? agent.supportedChains : ['N/A']} />
                <InfoList title="Supported workflows" items={agent.supportedWorkflows.length ? agent.supportedWorkflows : ['N/A']} />
                <InfoList title="Dependencies" items={agent.dependencies.length ? agent.dependencies : ['None']} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {agent.pricing.model === 'free' ? 'Free' : `$${agent.pricing.amount}`}
              </div>
              {agent.pricing.unit && agent.pricing.model !== 'free' && (
                <div className="text-xs text-muted-foreground">{agent.pricing.unit}</div>
              )}
              <Badge variant="secondary" className="mt-3">{agent.pricing.model.replace('_', ' ')}</Badge>
              <Separator className="my-4" />
              <div className="text-xs text-muted-foreground">Uptime</div>
              <div className="text-sm font-medium">{agent.performance.uptime}%</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="grid gap-6 lg:grid-cols-2">
          <AgentPerformanceCharts reputationHistory={reputationHistory} pricingHistory={pricingHistory} />

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {['Completed a 4-step research pipeline for org "CROO Labs"', 'Passed verification audit with zero flags', 'Latency improved after v3.2.1 release', 'Handled 214 concurrent jobs during peak load'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              No reviews yet for this agent.
            </div>
          )}
          {reviews.map((review) => (
            <Card key={review.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={review.author.avatarUrl} alt={review.author.name} />
                  <AvatarFallback>{initials(review.author.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{review.author.name}</span>
                    <div className="flex gap-0.5 text-warning">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn('h-3.5 w-3.5', i < review.rating ? 'fill-current' : 'opacity-30')} />
                      ))}
                    </div>
                  </div>
                  <h4 className="mt-1 text-sm font-medium">{review.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>API endpoints</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {agent.apiEndpoints.map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Badge variant="secondary" className="font-mono">{ep.method}</Badge>
                  <code className="text-sm">{ep.path}</code>
                  <span className="ml-auto text-xs text-muted-foreground">{ep.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Usage examples</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {agent.usageExamples.map((ex) => (
                <div key={ex.title} className="overflow-hidden rounded-xl border border-border bg-[#0a0a12]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                    <span className="text-xs text-white/60">{ex.title}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(ex.code); toast.success('Copied to clipboard'); }}
                      className="text-white/60 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <pre className="scrollbar-thin overflow-x-auto p-4 text-xs text-white/80"><code>{ex.code}</code></pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader><CardTitle>Version history</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {agent.versionHistory.map((v, i) => (
                  <div key={v.version} className="relative pl-6">
                    <span className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <GitCommitHorizontal className="h-3 w-3" />
                    </span>
                    {i < agent.versionHistory.length - 1 && (
                      <span className="absolute left-2 top-5 h-full w-px bg-border" />
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">v{v.version}</span>
                      {i === 0 && <Badge variant="success">Current</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(v.releasedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-medium text-foreground">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => <Badge key={item} variant="outline" className="text-[11px]">{item}</Badge>)}
      </div>
    </div>
  );
}
