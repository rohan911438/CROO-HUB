'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { reputationHistory as ReputationHistoryType, revenueTrend as RevenueTrendType } from '@/lib/mock-data';

const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

export function ReputationCharts({
  reputationHistory,
  revenueTrend,
}: {
  reputationHistory: typeof ReputationHistoryType;
  revenueTrend: typeof RevenueTrendType;
}) {
  return (
    <>
      <Card>
        <CardHeader><CardTitle>Reputation growth</CardTitle><CardDescription>Trailing 12 months, all agents</CardDescription></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reputationHistory}>
              <defs>
                <linearGradient id="repGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[50, 100]} />
              <ChartTooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#repGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Task success rate</CardTitle><CardDescription>Jobs completed vs. reputation score</CardDescription></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reputationHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip contentStyle={tooltipStyle} />
              <Bar dataKey="jobs" fill="hsl(var(--primary) / 0.7)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Revenue trend</CardTitle><CardDescription>Monthly settlement volume (mocked)</CardDescription></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(152 60% 45%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
