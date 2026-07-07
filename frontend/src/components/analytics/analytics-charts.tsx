'use client';

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';

type AnalyticsOverview = Awaited<ReturnType<typeof api.analytics.overview>>;

const pieColors = ['hsl(var(--primary))', 'hsl(263 70% 65%)', 'hsl(200 70% 60%)', 'hsl(152 55% 45%)', 'hsl(38 92% 55%)', 'hsl(340 70% 60%)'];

const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

export function AnalyticsCharts({ data }: { data: AnalyticsOverview }) {
  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Revenue overview</CardTitle><CardDescription>Monthly settlement volume across your completed transactions</CardDescription></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueTrend}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usage by category</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={data.categoryUsage} dataKey="jobs" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {data.categoryUsage.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <ChartTooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {data.categoryUsage.map((c, i) => (
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
            <BarChart data={data.latencyByCategory} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip contentStyle={tooltipStyle} />
              <Bar dataKey="latency" fill="hsl(var(--primary) / 0.7)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Discovery trends</CardTitle><CardDescription>Weekly discovery queries vs. orders that progressed to a hire</CardDescription></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.discoveryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="queries" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Queries" />
              <Line type="monotone" dataKey="hires" stroke="hsl(152 60% 45%)" strokeWidth={2} dot={false} name="Hires" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
