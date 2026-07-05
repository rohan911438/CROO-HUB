'use client';

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Activity, Bot, Workflow, DollarSign, Search, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { mockAgents, revenueTrend, latencyByCategory, discoveryTrends } from '@/lib/mock-data';
import { formatNumber } from '@/lib/utils';

const categoryUsage = Array.from(
  mockAgents.reduce((map, a) => map.set(a.category, (map.get(a.category) ?? 0) + a.performance.completedJobs), new Map<string, number>()),
).map(([category, jobs]) => ({ category, jobs }));

const pieColors = ['hsl(var(--primary))', 'hsl(263 70% 65%)', 'hsl(200 70% 60%)', 'hsl(152 55% 45%)', 'hsl(38 92% 55%)', 'hsl(340 70% 60%)'];

export default function AnalyticsPage() {
  const topAgents = [...mockAgents].sort((a, b) => b.performance.completedJobs - a.performance.completedJobs).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Marketplace activity, execution performance, and revenue trends.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Discovery queries (30d)" value="4,820" change={18} icon={Search} index={0} />
        <StatCard label="Workflow executions" value="1,204" change={9} icon={Workflow} index={1} />
        <StatCard label="Revenue processed" value="$68,410" change={22} icon={DollarSign} index={2} />
        <StatCard label="Avg. latency" value="2.1s" change={-5} icon={Gauge} index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue overview</CardTitle><CardDescription>Monthly settlement volume across all agents</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Usage by category</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryUsage} dataKey="jobs" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {categoryUsage.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <ChartTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {categoryUsage.map((c, i) => (
                <span key={c.category} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                  {c.category}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Latency by category</CardTitle><CardDescription>Average response time (ms)</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="latency" fill="hsl(var(--primary) / 0.7)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Discovery trends</CardTitle><CardDescription>Weekly discovery queries vs. successful hires</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={discoveryTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="queries" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Queries" />
                <Line type="monotone" dataKey="hires" stroke="hsl(152 60% 45%)" strokeWidth={2} dot={false} name="Hires" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top agents by volume</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{agent.name}</span>
                <span className="shrink-0 text-muted-foreground">{formatNumber(agent.performance.completedJobs)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
