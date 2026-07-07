'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Terminal, Webhook, ListTree, Database, Link2, Activity, Server, Cpu, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/dashboard/stat-card';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

const endpoints = [
  { method: 'POST', path: '/api/v1/auth/register', description: 'Create a new user account' },
  { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate and receive tokens' },
  { method: 'GET', path: '/api/v1/agents', description: 'List and filter marketplace agents' },
  { method: 'GET', path: '/api/v1/agents/:slug', description: 'Get a single agent profile' },
  { method: 'POST', path: '/api/v1/discovery', description: 'Get ranked agent matches for a task' },
  { method: 'GET', path: '/api/v1/workflows', description: 'List your saved workflows' },
  { method: 'POST', path: '/api/v1/workflows/:id/run', description: 'Simulate a workflow execution' },
  { method: 'GET', path: '/api/v1/templates', description: 'List workflow templates' },
  { method: 'GET', path: '/api/v1/transactions', description: 'List transaction history' },
  { method: 'GET', path: '/api/v1/orders', description: 'List Agent Commerce orders' },
  { method: 'GET', path: '/api/v1/notifications', description: 'List notifications' },
  { method: 'GET', path: '/api/v1/devconsole/health', description: 'Live process/DB/CAP health snapshot' },
];

type HealthData = Awaited<ReturnType<typeof api.devConsole.health>>;
type RequestLogEntry = Awaited<ReturnType<typeof api.devConsole.requests>>[number];
type OnchainEvent = Awaited<ReturnType<typeof api.devConsole.onchainEvents>>[number];

const RECORD_COLLECTIONS = ['agents', 'orders', 'transactions'] as const;
type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

export default function DevConsolePage() {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  const [health, setHealth] = useState<HealthData | null>(null);
  const [requestLog, setRequestLog] = useState<RequestLogEntry[] | null>(null);
  const [onchainEvents, setOnchainEvents] = useState<OnchainEvent[] | null>(null);
  const [collection, setCollection] = useState<RecordCollection>('agents');
  const [records, setRecords] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    if (!token) return;
    try {
      setHealth(await api.devConsole.health(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load system health');
    }
  }, [token]);

  const loadRequestLog = useCallback(async () => {
    if (!token) return;
    try {
      setRequestLog(await api.devConsole.requests(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load request log');
    }
  }, [token]);

  const loadOnchainEvents = useCallback(async () => {
    if (!token) return;
    try {
      setOnchainEvents(await api.devConsole.onchainEvents(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load on-chain events');
    }
  }, [token]);

  const loadRecords = useCallback(async (c: RecordCollection) => {
    if (!token) return;
    setRecords(null);
    try {
      setRecords(await api.devConsole.records(c, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load records');
    }
  }, [token]);

  useEffect(() => { void loadHealth(); void loadRequestLog(); void loadOnchainEvents(); }, [loadHealth, loadRequestLog, loadOnchainEvents]);
  useEffect(() => { void loadRecords(collection); }, [collection, loadRecords]);

  useEffect(() => {
    const interval = setInterval(() => { void loadHealth(); void loadRequestLog(); }, 5000);
    return () => clearInterval(interval);
  }, [loadHealth, loadRequestLog]);

  if (!token) {
    return <div className="p-6 text-sm text-muted-foreground">Connect your wallet to use the Developer Console.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Developer Console</h2>
          <p className="mt-1 text-sm text-muted-foreground">Live system health, API reference, request logs, and on-chain proofs.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="http://localhost:5000/api/docs" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Open Swagger docs
          </a>
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Uptime" value={health ? formatUptime(health.uptimeSeconds) : '—'} icon={Server} index={0} />
        <StatCard label="MongoDB" value={health ? health.mongodb.state : '—'} icon={Database} index={1} />
        <StatCard label="Avg. request latency" value={health ? `${health.requestLatency.avgMs}ms` : '—'} icon={Gauge} index={2} />
        <StatCard label="Memory (RSS)" value={health ? `${health.memory.rssMb}MB` : '—'} icon={Cpu} index={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">CAP protocol</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            {health ? (
              <>
                <Badge variant={health.cap.connected ? 'success' : health.cap.configured ? 'warning' : 'secondary'}>
                  {health.cap.connected ? 'connected' : health.cap.configured ? 'configured, unreachable' : 'not configured'}
                </Badge>
                <span className="text-xs text-muted-foreground">protocol {health.cap.protocolVersion}</span>
              </>
            ) : <Skeleton className="h-5 w-40" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">On-chain anchoring</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            {health ? (
              <Badge variant={health.onchainAnchoring.configured ? 'success' : 'secondary'}>
                {health.onchainAnchoring.configured ? 'configured' : 'not configured'}
              </Badge>
            ) : <Skeleton className="h-5 w-32" />}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reference">
        <TabsList>
          <TabsTrigger value="reference"><ListTree className="h-3.5 w-3.5" /> API reference</TabsTrigger>
          <TabsTrigger value="logs"><Terminal className="h-3.5 w-3.5" /> Request logs</TabsTrigger>
          <TabsTrigger value="records"><Database className="h-3.5 w-3.5" /> Records</TabsTrigger>
          <TabsTrigger value="onchain"><Link2 className="h-3.5 w-3.5" /> On-chain events</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-3.5 w-3.5" /> Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="reference">
          <Card>
            <CardHeader>
              <CardTitle>Endpoints</CardTitle>
              <CardDescription>Base URL: <code className="rounded bg-muted px-1.5 py-0.5">http://localhost:5000/api/v1</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {endpoints.map((ep) => (
                <div key={ep.path} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                  <Badge variant="secondary" className="font-mono">{ep.method}</Badge>
                  <code className="text-sm">{ep.path}</code>
                  <span className="text-xs text-muted-foreground">{ep.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Recent requests</CardTitle>
              <CardDescription>Live in-memory ring buffer (last {requestLog?.length ?? '…'} requests, refreshes every 5s)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!requestLog ? (
                <div className="space-y-2 p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : requestLog.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No requests logged yet this server session.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestLog.slice(0, 20).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono">{log.method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{log.path}</TableCell>
                        <TableCell>
                          <Badge variant={log.status < 400 ? 'success' : 'destructive'}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.durationMs}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Recent records</CardTitle>
                <CardDescription>Read-only, most recently updated first (users collection never exposed here)</CardDescription>
              </div>
              <Select value={collection} onValueChange={(v) => setCollection(v as RecordCollection)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORD_COLLECTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!records ? (
                <div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground">No {collection} yet.</p>
              ) : (
                <pre className="scrollbar-thin max-h-96 overflow-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  {JSON.stringify(records, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onchain">
          <Card>
            <CardHeader><CardTitle>On-chain anchoring events</CardTitle><CardDescription>Sourced from Agent Commerce orders with a recorded on-chain proof</CardDescription></CardHeader>
            <CardContent className="p-0">
              {!onchainEvents ? (
                <div className="space-y-2 p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : onchainEvents.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No on-chain proofs recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Proof</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onchainEvents.map((e) => (
                      <TableRow key={e.orderId}>
                        <TableCell className="max-w-xs truncate text-xs">{e.taskDescription}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{e.executionMode}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{e.status}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">
                          {typeof e.proof?.explorerUrl === 'string' ? (
                            <a href={e.proof.explorerUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View <ExternalLink className="inline h-3 w-3" /></a>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader><CardTitle>Webhook endpoint</CardTitle><CardDescription>Receive real-time events for workflow runs and transactions</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="webhook">Endpoint URL</Label>
                <Input id="webhook" placeholder="https://yourapp.com/webhooks/croo" disabled />
              </div>
              <p className="text-xs text-muted-foreground">Outbound webhook delivery isn&apos;t implemented on the backend yet - this panel is a placeholder for the planned feature.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
