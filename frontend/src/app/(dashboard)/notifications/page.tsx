'use client';

import { useState } from 'react';
import { Bell, Workflow, Wallet, ShieldCheck, Bot, Lock, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockNotifications } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/shared/relative-time';
import { Notification } from '@/types';

const typeIcons: Record<Notification['type'], typeof Bell> = {
  system: Bell,
  workflow: Workflow,
  transaction: Wallet,
  reputation: ShieldCheck,
  agent: Bot,
  security: Lock,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unread = notifications.filter((n) => !n.isRead).length;

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={unread === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => {
          const Icon = typeIcons[n.type];
          return (
            <Card
              key={n.id}
              className={cn('flex items-start gap-4 p-4 transition-colors', !n.isRead && 'border-primary/40 bg-primary/5')}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  <RelativeTime date={n.createdAt} className="shrink-0 text-xs text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{n.type}</Badge>
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)} className="text-xs text-primary hover:underline">
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
