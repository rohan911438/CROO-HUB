'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Moon, Sun, Monitor, Shield, Plug, Building2, Users, Bell, Palette, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn, initials } from '@/lib/utils';

const team = [
  { name: 'Jordan Reyes', email: 'demo@croohub.ai', role: 'Owner', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=jordan-reyes' },
  { name: 'Priya Nandan', email: 'priya@croohub.ai', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=priya-nandan' },
  { name: 'Marcus Webb', email: 'marcus@croohub.ai', role: 'Member', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=marcus-webb' },
];

const connectedServices = [
  { name: 'GitHub', description: 'Sync workflow definitions with a repository', connected: true },
  { name: 'Slack', description: 'Get notified in a channel of your choice', connected: true },
  { name: 'Zapier', description: 'Trigger workflows from external automations', connected: false },
  { name: 'Datadog', description: 'Stream execution logs and metrics', connected: false },
];

const accentColors = ['violet', 'blue', 'emerald', 'amber', 'rose'];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState('violet');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, workflow: true, transaction: true, digest: false });
  const [twoFactor, setTwoFactor] = useState(false);
  const [services, setServices] = useState(connectedServices);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace, team, and preferences.</p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList className="flex-wrap">
          <TabsTrigger value="organization"><Building2 className="h-3.5 w-3.5" /> Organization</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-3.5 w-3.5" /> Team</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="api"><KeyRound className="h-3.5 w-3.5" /> API</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="connections"><Plug className="h-3.5 w-3.5" /> Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card>
            <CardHeader><CardTitle>Organization details</CardTitle><CardDescription>Visible to all members of your workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input id="orgName" defaultValue="CROO Labs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orgSlug">Slug</Label>
                  <Input id="orgSlug" defaultValue="croo-labs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingEmail">Billing email</Label>
                <Input id="billingEmail" defaultValue="billing@croolabs.dev" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Pro plan</Badge>
                <span className="text-xs text-muted-foreground">12 of 25 seats used</span>
              </div>
              <Button variant="gradient" onClick={() => toast.success('Organization updated')}>Save changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team members</CardTitle>
                <CardDescription>Manage roles and access across your organization.</CardDescription>
              </div>
              <Button variant="outline">Invite member</Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {team.map((member) => (
                <div key={member.email} className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                  <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'}>{member.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notification preferences</CardTitle><CardDescription>Choose what you want to be notified about.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email', label: 'Email notifications', description: 'Receive updates via email' },
                { key: 'push', label: 'Push notifications', description: 'Browser push notifications' },
                { key: 'workflow', label: 'Workflow alerts', description: 'Notify when a workflow run finishes' },
                { key: 'transaction', label: 'Transaction alerts', description: 'Notify on payment status changes' },
                { key: 'digest', label: 'Weekly digest', description: 'A summary of marketplace activity every Monday' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  <Switch
                    checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                    onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, [item.key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader><CardTitle>API settings</CardTitle><CardDescription>Manage keys from the dedicated API Keys page.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="webhookUrl">Default webhook URL</Label>
                <Input id="webhookUrl" placeholder="https://yourapp.com/webhooks/croo" />
              </div>
              <Button variant="outline" asChild>
                <a href="/api-keys">Manage API keys →</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Customize how CROO Hub looks on your device.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Theme</Label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[{ id: 'dark', label: 'Dark', icon: Moon }, { id: 'light', label: 'Light', icon: Sun }, { id: 'system', label: 'System', icon: Monitor }].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                        theme === t.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                      )}
                    >
                      <t.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Accent color</Label>
                <div className="mt-2 flex gap-3">
                  {accentColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccent(c)}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-transform',
                        accent === c ? 'scale-110 border-foreground' : 'border-transparent',
                      )}
                      style={{ background: `var(--accent-${c}, hsl(263 70% 60%))` }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Density</Label>
                <div className="mt-2 flex gap-3">
                  {(['comfortable', 'compact'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensity(d)}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm capitalize transition-colors',
                        density === d ? 'border-primary bg-primary/10' : 'border-border',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Two-factor authentication</CardTitle><CardDescription>Add an extra layer of security to your account.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Authenticator app</div>
                  <div className="text-xs text-muted-foreground">Require a code from an authenticator app when signing in.</div>
                </div>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { device: 'Chrome on Windows', location: 'San Francisco, US', current: true },
                { device: 'Safari on iPhone', location: 'San Francisco, US', current: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{s.device}</div>
                    <div className="text-xs text-muted-foreground">{s.location}</div>
                  </div>
                  {s.current ? <Badge variant="success">Current session</Badge> : <Button variant="ghost" size="sm">Revoke</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections">
          <Card>
            <CardHeader><CardTitle>Connected services</CardTitle><CardDescription>Third-party integrations for your workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {services.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                  <Button
                    variant={s.connected ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setServices((prev) => prev.map((item, idx) => (idx === i ? { ...item, connected: !item.connected } : item)))}
                  >
                    {s.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
