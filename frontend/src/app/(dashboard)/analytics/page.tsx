'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Workflow, DollarSign, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/stat-card';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatNumber } from '@/lib/utils';

type AnalyticsOverview = Awaited<ReturnType<typeof api.analytics.overview>>;

const AnalyticsCharts = dynamic(
  () => import('@/components/analytics/analytics-charts').then((m) => m.AnalyticsCharts),
  { ssr: false, loading: () => <ChartsSkeleton /> },
);

function ChartsSkeleton() {
  return (
    <>
      <Card className="lg:col-span-2"><CardContent className="h-72 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      <Card><CardContent className="h-72 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      <Card><CardContent className="h-64 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      <Card className="lg:col-span-2"><CardContent className="h-64 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
    </>
  );
}

export default function AnalyticsPage() {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.analytics.overview(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load analytics');
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  if (!token) {
    return <div className="p-6 text-sm text-muted-foreground">Connect your wallet to view analytics.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Marketplace activity, execution performance, and revenue trends - live from your account data.</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Discovery queries (30d)" value={data ? formatNumber(data.stats.discoveryQueries30d) : '—'} icon={Search} index={0} />
        <StatCard label="Workflow executions" value={data ? formatNumber(data.stats.workflowExecutions) : '—'} icon={Workflow} index={1} />
        <StatCard label="Revenue processed" value={data ? `$${formatNumber(data.stats.revenueProcessed)}` : '—'} icon={DollarSign} index={2} />
        <StatCard label="Avg. agent latency" value={data ? `${(data.stats.avgAgentLatencyMs / 1000).toFixed(1)}s` : '—'} icon={Gauge} index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {!data ? <ChartsSkeleton /> : <AnalyticsCharts data={data} />}

        <Card>
          <CardHeader><CardTitle>Top agents by volume</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!data ? (
              <><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></>
            ) : data.topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent activity yet.</p>
            ) : (
              data.topAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{agent.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatNumber(agent.completedJobs)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
