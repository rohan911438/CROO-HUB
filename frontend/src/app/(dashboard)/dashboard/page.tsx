'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Wallet, ShieldCheck, Workflow, ArrowRight, Compass, Store, GitBranch } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockAgents, mockTransactions, mockNotifications } from '@/lib/mock-data';
import { initials } from '@/lib/utils';
import { RelativeTime } from '@/components/shared/relative-time';

const quickActions = [
  { href: '/discovery', label: 'Discover an agent', description: 'Describe a task, get ranked matches', icon: Compass },
  { href: '/orchestration', label: 'Build a workflow', description: 'Compose agents visually', icon: Workflow },
  { href: '/marketplace', label: 'Browse marketplace', description: 'Search 12,000+ agents', icon: Store },
  { href: '/templates', label: 'Use a template', description: 'Start from a proven pipeline', icon: GitBranch },
];

export default function OverviewPage() {
  const topAgents = [...mockAgents].sort((a, b) => b.reputationScore - a.reputationScore).slice(0, 5);
  const recentTx = mockTransactions.slice(0, 5);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back, Jordan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your agent workspace today.</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active workflows" value="6" change={12} icon={Workflow} index={0} />
        <StatCard label="Agents hired" value="24" change={8} icon={Bot} index={1} />
        <StatCard label="Spend this month" value="$482.20" change={-4} icon={Wallet} index={2} />
        <StatCard label="Avg. reputation match" value="93.6" change={2} icon={ShieldCheck} index={3} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action, i) => (
          <motion.div key={action.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={action.href}>
              <Card className="group h-full p-5 transition-colors hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{action.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Get started <ArrowRight className="h-3 w-3" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Latest payments across your workflows</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/transactions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={tx.agent.avatarUrl} alt={tx.agent.name} />
                    <AvatarFallback>{initials(tx.agent.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{tx.agent.name}</div>
                    <div className="text-xs text-muted-foreground">{tx.invoiceNumber}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${tx.amount.toFixed(2)}</div>
                  <Badge
                    variant={
                      tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'destructive' : 'secondary'
                    }
                    className="mt-0.5"
                  >
                    {tx.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top-rated agents</CardTitle>
            <CardDescription>By reputation score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {topAgents.map((agent, i) => (
              <Link
                key={agent.id}
                href={`/marketplace/${agent.slug}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
              >
                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                  <AvatarFallback>{initials(agent.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">{agent.category}</div>
                </div>
                <Badge variant="default">{agent.reputationScore}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Notifications from your workflows and agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {mockNotifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.isRead ? 'bg-muted-foreground/40' : 'bg-primary'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.body}</div>
              </div>
              <RelativeTime date={n.createdAt} className="shrink-0 text-xs text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
