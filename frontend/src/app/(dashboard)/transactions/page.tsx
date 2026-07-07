'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, Wallet, Clock, CheckCircle2, ShieldAlert, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { initials } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { AgentOrder, OrderStatus, Transaction } from '@/types';

const statusVariant: Record<string, 'success' | 'secondary' | 'destructive' | 'warning' | 'default'> = {
  completed: 'success',
  processing: 'default',
  pending: 'secondary',
  escrow_hold: 'warning',
  failed: 'destructive',
  refunded: 'secondary',
};

const ORDER_STATUS_TO_TX_STATUS: Record<OrderStatus, Transaction['status']> = {
  planning: 'pending',
  negotiating: 'pending',
  accepted: 'pending',
  paid: 'escrow_hold',
  running: 'processing',
  delivering: 'processing',
  completed: 'completed',
  rejected: 'failed',
  expired: 'failed',
  failed: 'failed',
  cancelled: 'refunded',
};

function mapOrderToTransaction(order: AgentOrder): Transaction {
  const chosen = order.candidates.find((c) => c.chosen);
  return {
    id: order._id,
    agent: { name: chosen?.name ?? 'Unassigned', avatarUrl: chosen?.avatarUrl ?? '', slug: chosen?.slug ?? '' },
    amount: order.settlement?.amountUsdc ?? order.budget ?? 0,
    currency: 'USDC',
    status: ORDER_STATUS_TO_TX_STATUS[order.status],
    description: order.taskDescription,
    invoiceNumber: `INV-${order._id.slice(-8).toUpperCase()}`,
    settlementMethod: order.onchainProof ? 'on_chain_settled' : 'placeholder_offchain',
    escrow: {
      isEscrow: order.status === 'paid',
      releaseCondition: order.status === 'paid' ? 'Delivery verification pending' : undefined,
    },
    createdAt: order.createdAt,
  };
}

export default function TransactionsPage() {
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState<AgentOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = (await api.orders.list(token)) as AgentOrder[];
        setOrders(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load transactions');
      }
    })();
  }, [token]);

  const orderById = useMemo(() => new Map((orders ?? []).map((o) => [o._id, o])), [orders]);
  const transactions = useMemo(() => (orders ?? []).map(mapOrderToTransaction), [orders]);

  const filtered = useMemo(
    () => (status === 'all' ? transactions : transactions.filter((t) => t.status === status)),
    [status, transactions],
  );

  const totals = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
    const pending = transactions.filter((t) => t.status === 'pending' || t.status === 'processing').reduce((s, t) => s + t.amount, 0);
    const escrow = transactions.filter((t) => t.status === 'escrow_hold').reduce((s, t) => s + t.amount, 0);
    return { completed, pending, escrow };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Invoices, escrow, and settlement history across your agent workflows.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-foreground/90">
          <span className="font-medium">This reflects your real Agent Commerce orders.</span> Completed executions that
          anchored a proof on Base Sepolia link out to Basescan below; others are shown honestly as off-chain or still in
          progress.
        </p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completed settlements" value={`$${totals.completed.toFixed(2)}`} icon={CheckCircle2} index={0} />
        <StatCard label="Pending / processing" value={`$${totals.pending.toFixed(2)}`} icon={Clock} index={1} />
        <StatCard label="Held in escrow" value={`$${totals.escrow.toFixed(2)}`} icon={ShieldAlert} index={2} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction history</CardTitle>
            <CardDescription>{filtered.length} records</CardDescription>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="escrow_hold">Escrow hold</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Settlement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!orders ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-3">
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                    No transactions yet - create an Agent Commerce order to see settlement history here.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((tx) => {
                  const order = orderById.get(tx.id);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={tx.agent.avatarUrl} alt={tx.agent.name} />
                            <AvatarFallback>{initials(tx.agent.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{tx.agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{tx.description}</TableCell>
                      <TableCell className="text-sm font-medium">${tx.amount.toFixed(2)} {tx.currency}</TableCell>
                      <TableCell>
                        {order?.onchainProof ? (
                          <a
                            href={order.onchainProof.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View on Basescan <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Wallet className="h-3 w-3" /> Off-chain / simulated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[tx.status]}>{tx.status.replace('_', ' ')}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
