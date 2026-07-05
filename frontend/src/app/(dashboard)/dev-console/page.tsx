'use client';

import { ExternalLink, Terminal, Webhook, ListTree } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  { method: 'GET', path: '/api/v1/notifications', description: 'List notifications' },
];

const requestLogs = [
  { time: '14:32:08', method: 'POST', path: '/api/v1/discovery', status: 200, latency: '412ms' },
  { time: '14:28:51', method: 'GET', path: '/api/v1/agents', status: 200, latency: '88ms' },
  { time: '14:15:03', method: 'POST', path: '/api/v1/workflows/64f.../run', status: 200, latency: '1.2s' },
  { time: '13:59:47', method: 'GET', path: '/api/v1/transactions', status: 200, latency: '64ms' },
  { time: '13:40:12', method: 'POST', path: '/api/v1/auth/login', status: 401, latency: '55ms' },
];

export default function DevConsolePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Developer Console</h2>
          <p className="mt-1 text-sm text-muted-foreground">API reference, request logs, and webhook configuration.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="http://localhost:5000/api/docs" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Open Swagger docs
          </a>
        </Button>
      </div>

      <Tabs defaultValue="reference">
        <TabsList>
          <TabsTrigger value="reference"><ListTree className="h-3.5 w-3.5" /> API reference</TabsTrigger>
          <TabsTrigger value="logs"><Terminal className="h-3.5 w-3.5" /> Request logs</TabsTrigger>
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
            <CardHeader><CardTitle>Recent requests</CardTitle><CardDescription>Last 24 hours (mocked)</CardDescription></CardHeader>
            <CardContent className="p-0">
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
                  {requestLogs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm text-muted-foreground">{log.time}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{log.method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{log.path}</TableCell>
                      <TableCell>
                        <Badge variant={log.status < 400 ? 'success' : 'destructive'}>{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.latency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader><CardTitle>Webhook endpoint</CardTitle><CardDescription>Receive real-time events for workflow runs and transactions</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="webhook">Endpoint URL</Label>
                <Input id="webhook" placeholder="https://yourapp.com/webhooks/croo" />
              </div>
              <Button variant="gradient">Save webhook</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
