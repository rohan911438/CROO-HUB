'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Network,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Link2,
  Unlink,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

interface CapStatus {
  configured: boolean;
  connected: boolean;
  protocolVersion: string;
  apiUrl: string;
  wsUrl: string;
  chainId: number;
  error?: string;
  checkedAt: string;
}

interface MyAgent {
  _id: string;
  name: string;
  slug: string;
  category: string;
  verification: string;
  availability: string;
  crooAgentId?: string;
  crooServiceId?: string;
  crooSyncStatus: 'unlinked' | 'linked' | 'error';
  crooLastSyncedAt?: string;
}

interface RegistrationGuide {
  dashboardUrl: string;
  steps: string[];
  agent: { suggestedDescription: string; suggestedSkillTags: string[]; note: string };
  service: {
    name: string;
    priceUsdc: number;
    description: string;
    slaHours: number;
    slaMinutes: number;
    deliverableType: string;
    requirementsType: string;
  };
  currencyWarning?: string;
}

const CAP_CAPABILITIES = [
  'NegotiationCreated / NegotiationRejected / NegotiationExpired events',
  'Order lifecycle sync: OrderCreated -> OrderPaid -> OrderCompleted / Rejected / Expired',
  'Read-only order & negotiation listing (role-scoped)',
  'USDC (Base mainnet) settlement mirrored into Transactions',
];

export default function CrooIntegrationPage() {
  const [status, setStatus] = useState<CapStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [agents, setAgents] = useState<MyAgent[] | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [guideAgent, setGuideAgent] = useState<MyAgent | null>(null);
  const [guide, setGuide] = useState<RegistrationGuide | null>(null);
  const [linkForm, setLinkForm] = useState({ crooAgentId: '', crooServiceId: '' });
  const [saving, setSaving] = useState(false);
  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await api.cap.status();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.cap.myAgents(token);
      setAgents(data);
      setAgentsError(null);
    } catch (err) {
      setAgentsError(err instanceof ApiError ? err.message : 'Failed to load agents');
    }
  }, [token]);

  useEffect(() => {
    void loadStatus();
    void loadAgents();
  }, [loadStatus, loadAgents]);

  async function openGuide(agent: MyAgent) {
    if (!token) return;
    setGuideAgent(agent);
    setGuide(null);
    setLinkForm({ crooAgentId: agent.crooAgentId ?? '', crooServiceId: agent.crooServiceId ?? '' });
    const data = await api.cap.registrationGuide(agent.slug, token);
    setGuide(data as RegistrationGuide);
  }

  async function saveLink() {
    if (!token || !guideAgent || !linkForm.crooAgentId) return;
    setSaving(true);
    try {
      await api.cap.linkAgent(
        guideAgent.slug,
        { crooAgentId: linkForm.crooAgentId, crooServiceId: linkForm.crooServiceId || undefined },
        token,
      );
      setGuideAgent(null);
      await loadAgents();
    } catch (err) {
      setAgentsError(err instanceof ApiError ? err.message : 'Failed to link agent');
    } finally {
      setSaving(false);
    }
  }

  async function unlink(agent: MyAgent) {
    if (!token) return;
    await api.cap.unlinkAgent(agent.slug, token);
    await loadAgents();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Network className="h-5 w-5" /> CROO Integration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CROO Hub's connection to CROO Network (CAP) - the decentralized agent commerce protocol on Base.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadStatus()}>
          <RefreshCw className="h-4 w-4" /> Refresh status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection health</CardTitle>
          <CardDescription>Live status of the CAP SDK connection configured on the CROO Hub backend.</CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !status ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" /> Could not reach the CROO Hub backend.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatusStat
                label="Status"
                value={
                  !status.configured ? (
                    <Badge variant="warning">Not configured</Badge>
                  ) : status.connected ? (
                    <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Connected</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="h-3 w-3" /> Disconnected</Badge>
                  )
                }
              />
              <StatusStat label="Protocol version" value={<span className="font-mono text-sm">{status.protocolVersion}</span>} />
              <StatusStat label="Chain" value={<span className="font-mono text-sm">Base ({status.chainId})</span>} />
              <StatusStat label="Last checked" value={<span className="text-sm">{new Date(status.checkedAt).toLocaleTimeString()}</span>} />
              <StatusStat label="API URL" value={<code className="text-xs">{status.apiUrl}</code>} />
              <StatusStat label="WebSocket URL" value={<code className="text-xs">{status.wsUrl}</code>} />
              {status.error && (
                <div className="col-span-full flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {status.error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported CAP capabilities</CardTitle>
          <CardDescription>What CROO Hub's integration currently does (read/settlement-sync only - it never signs on your behalf).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {CAP_CAPABILITIES.map((c) => (
            <div key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> {c}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your agents</CardTitle>
          <CardDescription>
            Registration, marketplace publication, and sync status for each CROO-Hub agent you own.
            Publishing to the CROO Agent Store is a guided, dashboard-based process (CROO does not
            expose a public create-agent API) - CROO Hub prepares the exact metadata for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!token ? (
            <div className="p-6 text-sm text-muted-foreground">Sign in to view and link your agents.</div>
          ) : agentsError ? (
            <div className="p-6 text-sm text-destructive">{agentsError}</div>
          ) : !agents ? (
            <div className="space-y-2 p-6"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : agents.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">You don't own any agents yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Sync status</TableHead>
                  <TableHead>CROO Agent ID</TableHead>
                  <TableHead>Last synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent._id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      {agent.crooSyncStatus === 'linked' ? (
                        <Badge variant="success">Linked</Badge>
                      ) : agent.crooSyncStatus === 'error' ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        <Badge variant="secondary">Not linked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{agent.crooAgentId ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agent.crooLastSyncedAt ? new Date(agent.crooLastSyncedAt).toLocaleString() : 'never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openGuide(agent)}>
                          <Link2 className="h-3.5 w-3.5" /> {agent.crooSyncStatus === 'linked' ? 'Update link' : 'Publish guide'}
                        </Button>
                        {agent.crooSyncStatus === 'linked' && (
                          <Button size="sm" variant="ghost" onClick={() => unlink(agent)}>
                            <Unlink className="h-3.5 w-3.5" /> Unlink
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!guideAgent} onOpenChange={(open) => !open && setGuideAgent(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Publish "{guideAgent?.name}" to the CROO Agent Store</DialogTitle>
            <DialogDescription>
              CROO registers agents through its own dashboard, not an API - follow these steps there,
              then paste the resulting IDs back here to link the two systems.
            </DialogDescription>
          </DialogHeader>

          {!guide ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-4 text-sm">
              <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                {guide.steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>

              <Separator />

              <div className="space-y-2">
                <Field label="Suggested description" value={guide.agent.suggestedDescription} />
                <Field label="Suggested skill tags" value={guide.agent.suggestedSkillTags.join(', ') || '—'} />
                <Field label="Service name" value={guide.service.name} />
                <Field label="Price (USDC)" value={String(guide.service.priceUsdc)} />
                <Field label="Service description" value={guide.service.description} />
                <Field label="SLA" value={`${guide.service.slaHours}h ${guide.service.slaMinutes}m`} />
                <Field label="Deliverable type" value={guide.service.deliverableType} />
                <Field label="Requirements type" value={guide.service.requirementsType} />
              </div>

              {guide.currencyWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {guide.currencyWarning}
                </div>
              )}

              <Button variant="outline" size="sm" asChild>
                <a href={guide.dashboardUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Open agent.croo.network
                </a>
              </Button>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="crooAgentId">CROO Agent ID (from the dashboard, after registering)</Label>
                <Input
                  id="crooAgentId"
                  value={linkForm.crooAgentId}
                  onChange={(e) => setLinkForm((f) => ({ ...f, crooAgentId: e.target.value }))}
                  placeholder="agent_..."
                />
                <Label htmlFor="crooServiceId">CROO Service ID (optional)</Label>
                <Input
                  id="crooServiceId"
                  value={linkForm.crooServiceId}
                  onChange={(e) => setLinkForm((f) => ({ ...f, crooServiceId: e.target.value }))}
                  placeholder="service_..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setGuideAgent(null)}>Cancel</Button>
            <Button variant="gradient" disabled={!linkForm.crooAgentId || saving} onClick={saveLink}>
              {saving ? 'Saving...' : 'Save link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>About this integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            CAP's escrow (CAPCore/CAPVault) runs on <strong>Base mainnet only</strong> - there is no
            testnet. CROO Hub's own on-chain contracts (AgentRegistry, EscrowCommerce, Reputation,
            OrchestrationMetadata) remain unchanged and continue handling CROO-Hub-native bookings;
            CAP is an additional, parallel settlement rail for agents also listed on the CROO Agent
            Store. See <code>CROO_CAP_COMPATIBILITY_REPORT.md</code> in the repo for the full audit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
