'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Handshake,
  Plus,
  ExternalLink,
  RotateCcw,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Clock,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type OrderStatus =
  | 'planning' | 'negotiating' | 'accepted' | 'paid' | 'running' | 'delivering'
  | 'completed' | 'rejected' | 'expired' | 'failed' | 'cancelled';

interface OrderEvent {
  timestamp: string;
  type: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface OrderCandidate {
  slug: string;
  name: string;
  matchScore: number;
  trustScore: number;
  estimatedCostUsd: number;
  reasoning: string;
  chosen: boolean;
}

interface AgentOrder {
  _id: string;
  taskDescription: string;
  budget?: number;
  executionMode: 'live' | 'simulated';
  requestedMode: 'auto' | 'live' | 'simulated';
  status: OrderStatus;
  candidates: OrderCandidate[];
  cap: { negotiationId?: string; orderId?: string; protocolVersion: string };
  settlement: { amountUsdc?: number; feeUsdc?: number; payTxHash?: string; deliverTxHash?: string; clearTxHash?: string };
  result?: { deliverableType: string; deliverableText?: string; contentHash?: string };
  onchainProof?: { network: string; contractAddress: string; executionId: string; txHash: string; explorerUrl: string; recordedAt: string };
  events: OrderEvent[];
  retryCount: number;
  maxRetries: number;
  latencyMs?: number;
  createdAt: string;
}

const TERMINAL: OrderStatus[] = ['completed', 'rejected', 'expired', 'failed', 'cancelled'];

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  planning: 'secondary',
  negotiating: 'default',
  accepted: 'default',
  paid: 'default',
  running: 'default',
  delivering: 'default',
  completed: 'success',
  rejected: 'destructive',
  expired: 'warning',
  failed: 'destructive',
  cancelled: 'secondary',
};

const EVENT_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };

export default function AgentCommercePage() {
  const [orders, setOrders] = useState<AgentOrder[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentOrder | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ taskDescription: '', budget: '', mode: 'auto' as 'auto' | 'live' | 'simulated', targetServiceId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await api.orders.list(token)) as AgentOrder[];
      setOrders(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load orders');
    }
  }, [token]);

  const loadSelected = useCallback(async (id: string) => {
    if (!token) return;
    const data = (await api.orders.get(id, token)) as AgentOrder;
    setSelected(data);
    setOrders((prev) => (prev ? prev.map((o) => (o._id === id ? data : o)) : prev));
  }, [token]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (selectedId) void loadSelected(selectedId);
  }, [selectedId, loadSelected]);

  // Poll the selected order while it's still in flight, so the timeline updates without a socket.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedId && selected && !TERMINAL.includes(selected.status)) {
      pollRef.current = setInterval(() => void loadSelected(selectedId), 1500);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedId, selected?.status, loadSelected, selected]);

  async function submitOrder() {
    if (!token || !form.taskDescription.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = (await api.orders.create(
        {
          taskDescription: form.taskDescription,
          budget: form.budget ? Number(form.budget) : undefined,
          requestedMode: form.mode,
          targetServiceId: form.targetServiceId || undefined,
        },
        token,
      )) as AgentOrder;
      setCreateOpen(false);
      setForm({ taskDescription: '', budget: '', mode: 'auto', targetServiceId: '' });
      await loadOrders();
      setSelectedId(order._id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  async function retry() {
    if (!token || !selectedId) return;
    await api.orders.retry(selectedId, token);
    await loadSelected(selectedId);
  }

  async function cancel() {
    if (!token || !selectedId) return;
    await api.orders.cancel(selectedId, token);
    await loadSelected(selectedId);
  }

  if (!token) {
    return <div className="p-6 text-sm text-muted-foreground">Sign in to use Agent Commerce.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Handshake className="h-5 w-5" /> Agent Commerce
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The Planner discovers a matching CROO-Hub agent, negotiates, settles payment, and anchors an execution proof - live via CAP where a real counterparty exists, simulated (clearly labeled) otherwise.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Orders</CardTitle><CardDescription>Most recent first</CardDescription></CardHeader>
          <CardContent className="space-y-2 p-3">
            {!orders ? (
              <>
                <Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" />
              </>
            ) : orders.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No orders yet - create one to see the Planner in action.</p>
            ) : (
              orders.map((o) => (
                <button
                  key={o._id}
                  onClick={() => setSelectedId(o._id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                    selectedId === o._id ? 'border-primary/50 bg-accent' : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 font-medium">{o.taskDescription}</span>
                    <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{o.executionMode}</Badge>
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          {!selected ? (
            <CardContent className="p-6 text-sm text-muted-foreground">Select an order to see its full execution timeline.</CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{selected.taskDescription}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status}</Badge>
                    <Badge variant="outline">{selected.executionMode === 'live' ? 'Live CAP' : 'Simulated'}</Badge>
                    <span className="font-mono text-xs">{selected.cap.protocolVersion}</span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!TERMINAL.includes(selected.status) && (
                    <Button size="sm" variant="outline" onClick={cancel}><XCircle className="h-3.5 w-3.5" /> Cancel</Button>
                  )}
                  {TERMINAL.includes(selected.status) && selected.status !== 'completed' && selected.retryCount < selected.maxRetries && (
                    <Button size="sm" variant="outline" onClick={retry}>
                      <RotateCcw className="h-3.5 w-3.5" /> Retry ({selected.retryCount}/{selected.maxRetries})
                    </Button>
                  )}
                  {!TERMINAL.includes(selected.status) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {selected.candidates.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Planner discovery</div>
                    <div className="space-y-1.5">
                      {selected.candidates.slice(0, 4).map((c) => (
                        <div key={c.slug} className={`flex items-center justify-between rounded-lg border p-2 text-xs ${c.chosen ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                          <div className="flex items-center gap-2">
                            {c.chosen && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                            <span className="font-medium">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{c.matchScore}% match</span>
                            <span>${c.estimatedCostUsd.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Execution timeline</div>
                  <div className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                    {selected.events.map((e, i) => {
                      const Icon = EVENT_ICON[e.level];
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            e.level === 'success' ? 'text-success' : e.level === 'error' ? 'text-destructive' : e.level === 'warning' ? 'text-warning' : 'text-primary'
                          }`} />
                          <div>
                            <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>{' '}
                            <span>{e.message}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3 text-xs">
                    <div className="mb-1.5 flex items-center gap-1.5 font-medium"><Clock className="h-3.5 w-3.5" /> Settlement</div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>Amount: {selected.settlement.amountUsdc ? `$${selected.settlement.amountUsdc.toFixed(2)}` : '—'}</div>
                      <div>Fee: {selected.settlement.feeUsdc ? `$${selected.settlement.feeUsdc.toFixed(2)}` : '—'}</div>
                      <div>Latency: {selected.latencyMs ? `${(selected.latencyMs / 1000).toFixed(1)}s` : '—'}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-xs">
                    <div className="mb-1.5 flex items-center gap-1.5 font-medium"><Link2 className="h-3.5 w-3.5" /> On-chain proof</div>
                    {selected.onchainProof ? (
                      <div className="space-y-1 text-muted-foreground">
                        <div>{selected.onchainProof.network}, execution #{selected.onchainProof.executionId}</div>
                        <a href={selected.onchainProof.explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          View on Basescan <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Not yet anchored{TERMINAL.includes(selected.status) && selected.status !== 'completed' ? ' (order did not complete)' : '…'}</p>
                    )}
                  </div>
                </div>

                {selected.result?.deliverableText && (
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Final output</div>
                    <pre className="scrollbar-thin max-h-40 overflow-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">{selected.result.deliverableText}</pre>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Agent Commerce order</DialogTitle>
            <DialogDescription>The Planner will rank candidate agents and drive the order to completion automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Task description</Label>
              <Textarea
                value={form.taskDescription}
                onChange={(e) => setForm((f) => ({ ...f, taskDescription: e.target.value }))}
                placeholder="e.g. Summarize competitor pricing pages and flag any changes"
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget (USDC, optional)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="25" />
              </div>
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as typeof f.mode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (live if a service id is given)</SelectItem>
                    <SelectItem value="simulated">Simulated</SelectItem>
                    <SelectItem value="live">Live (requires a real CROO service id)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.mode !== 'simulated' && (
              <div className="space-y-1.5">
                <Label>Target CROO service ID (optional - CAP has no discovery API)</Label>
                <Input value={form.targetServiceId} onChange={(e) => setForm((f) => ({ ...f, targetServiceId: e.target.value }))} placeholder="service_..." />
              </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="gradient" disabled={!form.taskDescription.trim() || submitting} onClick={submitOrder}>
              {submitting ? 'Submitting...' : 'Submit to Planner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
