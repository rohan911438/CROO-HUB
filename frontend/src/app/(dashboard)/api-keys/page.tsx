'use client';

import { useState } from 'react';
import { KeyRound, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ApiKeyRow {
  id: string;
  name: string;
  preview: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const initialKeys: ApiKeyRow[] = [
  { id: '1', name: 'Production backend', preview: 'croo_live_7f2a...93bd', createdAt: '2026-04-02', lastUsedAt: '2026-07-04' },
  { id: '2', name: 'Local development', preview: 'croo_test_1c9e...44aa', createdAt: '2026-05-11', lastUsedAt: '2026-07-05' },
  { id: '3', name: 'CI pipeline', preview: 'croo_test_88bd...220f', createdAt: '2026-06-01', lastUsedAt: null },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(initialKeys);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  function createKey() {
    if (!newName.trim()) return;
    const raw = `croo_live_${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 6)}`;
    setKeys((prev) => [{ id: String(Date.now()), name: newName, preview: raw, createdAt: new Date().toISOString().slice(0, 10), lastUsedAt: null }, ...prev]);
    setNewKey(`croo_live_${crypto.randomUUID().replace(/-/g, '')}`);
  }

  function closeDialog() {
    setOpen(false);
    setNewName('');
    setNewKey(null);
    setReveal(false);
  }

  function revoke(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success('API key revoked');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">API Keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage credentials for programmatic access to the CROO Hub API.</p>
        </div>
        <Button variant="gradient" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Create API key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Active keys</CardTitle>
          <CardDescription>Keys are scoped to your organization and inherit your account role.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="text-sm font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{k.preview}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.createdAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.lastUsedAt ?? 'Never'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => revoke(k.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Give your key a descriptive name so you can identify it later.</DialogDescription>
          </DialogHeader>

          {!newKey ? (
            <div className="space-y-1.5">
              <Label htmlFor="keyName">Key name</Label>
              <Input id="keyName" placeholder="e.g. Staging worker" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Your new API key</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
                <span className="flex-1 truncate">{reveal ? newKey : newKey.replace(/./g, '•').slice(0, 32)}</span>
                <button onClick={() => setReveal(!reveal)}>{reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <button onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied to clipboard'); }}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Store this key securely — it won&apos;t be shown again.</p>
            </div>
          )}

          <DialogFooter>
            {!newKey ? (
              <Button variant="gradient" onClick={createKey} disabled={!newName.trim()}>Generate key</Button>
            ) : (
              <Button variant="gradient" onClick={closeDialog}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
