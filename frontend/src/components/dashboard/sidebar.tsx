'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Store,
  Compass,
  Workflow,
  ShieldCheck,
  GitBranch,
  BarChart3,
  Wallet,
  KeyRound,
  Terminal,
  Bell,
  Settings,
  User,
  HelpCircle,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  Network,
  Handshake,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const nav = [
  { section: 'Workspace', items: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/marketplace', label: 'Agent Marketplace', icon: Store },
    { href: '/discovery', label: 'Discovery Engine', icon: Compass },
    { href: '/agent-commerce', label: 'Agent Commerce', icon: Handshake },
    { href: '/orchestration', label: 'Orchestration Studio', icon: Workflow },
    { href: '/reputation', label: 'Reputation Center', icon: ShieldCheck },
    { href: '/templates', label: 'Workflow Templates', icon: GitBranch },
  ]},
  { section: 'Insights', items: [
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/transactions', label: 'Transactions', icon: Wallet },
  ]},
  { section: 'Developer', items: [
    { href: '/architecture', label: 'Architecture', icon: Layers },
    { href: '/api-keys', label: 'API Keys', icon: KeyRound },
    { href: '/dev-console', label: 'Developer Console', icon: Terminal },
    { href: '/croo-integration', label: 'CROO Integration', icon: Network },
  ]},
  { section: 'Account', items: [
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/help', label: 'Help Center', icon: HelpCircle },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <motion.aside
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/60 bg-card/40 glass lg:flex"
      >
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                <Bot className="h-4.5 w-4.5" />
              </span>
              CROO Hub
            </Link>
          )}
          {collapsed && (
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Bot className="h-4.5 w-4.5" />
            </span>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {nav.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.section}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        active
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        collapsed && 'justify-center',
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  return collapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={item.href}>{link}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border/60 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
