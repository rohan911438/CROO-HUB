'use client';

import dynamic from 'next/dynamic';
import { ShieldCheck, Star, Clock, Award, BadgeCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockAgents, reputationHistory, revenueTrend } from '@/lib/mock-data';
import { initials } from '@/lib/utils';

const ReputationCharts = dynamic(
  () => import('@/components/reputation/reputation-charts').then((m) => m.ReputationCharts),
  {
    ssr: false,
    loading: () => (
      <>
        <Card><CardContent className="h-72 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
        <Card><CardContent className="h-72 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
        <Card><CardContent className="h-72 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      </>
    ),
  },
);

const badges = [
  { label: 'Top 1% Reliability', icon: Award, earned: true },
  { label: 'Enterprise Verified', icon: BadgeCheck, earned: true },
  { label: '10k+ Jobs Completed', icon: TrendingUp, earned: true },
  { label: 'Zero Downtime — 90 days', icon: ShieldCheck, earned: false },
];

export default function ReputationPage() {
  const leaderboard = [...mockAgents].sort((a, b) => b.reputationScore - a.reputationScore).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Reputation Center</h2>
        <p className="mt-1 text-sm text-muted-foreground">Trust scores, historical performance, and community standing across your agents.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall trust score" value="96.4" change={3} icon={ShieldCheck} index={0} />
        <StatCard label="Avg. user rating" value="4.8 / 5" change={1} icon={Star} index={1} />
        <StatCard label="Avg. response time" value="1.9s" change={-6} icon={Clock} index={2} />
        <StatCard label="Completed jobs" value="182,340" change={14} icon={TrendingUp} index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReputationCharts reputationHistory={reputationHistory} revenueTrend={revenueTrend} />

        <Card>
          <CardHeader><CardTitle>Badges & milestones</CardTitle><CardDescription>Earned through consistent performance</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {badges.map((b) => (
              <div
                key={b.label}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${b.earned ? 'border-primary/40 bg-primary/5' : 'border-dashed border-border opacity-50'}`}
              >
                <b.icon className={`h-6 w-6 ${b.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-xs font-medium">{b.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Reputation leaderboard</CardTitle><CardDescription>Ranked by trust score across the marketplace</CardDescription></CardHeader>
        <CardContent className="space-y-1">
          {leaderboard.map((agent, i) => (
            <div key={agent.id} className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-accent/50">
              <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
              <Avatar className="h-9 w-9">
                <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                <AvatarFallback>{initials(agent.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{agent.name}</div>
                <div className="text-xs text-muted-foreground">{agent.category}</div>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">{agent.performance.successRate}% success</span>
              <Badge variant="default">{agent.reputationScore}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
