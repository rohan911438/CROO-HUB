'use client';

import { useMemo, useState } from 'react';
import { Info, Wallet, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockTransactions } from '@/lib/mock-data';
import { initials } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'secondary' | 'destructive' | 'warning' | 'default'> = {
  completed: 'success',
  processing: 'default',
  pending: 'secondary',
  escrow_hold: 'warning',
  failed: 'destructive',
  refunded: 'secondary',
};

export default function TransactionsPage() {
  const [status, setStatus] = useState('all');

  const filtered = useMemo(
    () => (status === 'all' ? mockTransactions : mockTransactions.filter((t) => t.status === status)),
    [status],
  );

  const totals = useMemo(() => {
    const completed = mockTransactions.filter((t) => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
    const pending = mockTransactions.filter((t) => t.status === 'pending' || t.status === 'processing').reduce((s, t) => s + t.amount, 0);
    const escrow = mockTransactions.filter((t) => t.status === 'escrow_hold').reduce((s, t) => s + t.amount, 0);
    return { completed, pending, escrow };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Invoices, escrow, and settlement history across your agent workflows.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-foreground/90">
          <span className="font-medium">On-chain settlement is not yet connected.</span> All transactions below use a
          placeholder off-chain ledger. Amounts and escrow states will map directly onto CROO CAP settlement once available.
        </p>
      </div>

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
              {filtered.map((tx) => (
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
                    <Badge variant="secondary" className="gap-1">
                      <Wallet className="h-3 w-3" /> Off-chain (mock)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[tx.status]}>{tx.status.replace('_', ' ')}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
