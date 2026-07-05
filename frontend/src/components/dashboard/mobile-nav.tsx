'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Store, Compass, Workflow, ShieldCheck, GitBranch, BarChart3, Wallet,
  KeyRound, Terminal, Bell, Settings, User, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/marketplace', label: 'Agent Marketplace', icon: Store },
  { href: '/discovery', label: 'Discovery Engine', icon: Compass },
  { href: '/orchestration', label: 'Orchestration Studio', icon: Workflow },
  { href: '/reputation', label: 'Reputation Center', icon: ShieldCheck },
  { href: '/templates', label: 'Workflow Templates', icon: GitBranch },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/transactions', label: 'Transactions', icon: Wallet },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/dev-console', label: 'Developer Console', icon: Terminal },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/help', label: 'Help Center', icon: HelpCircle },
];

export function MobileNav({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        exit={{ x: -280 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-full w-72 flex-col bg-card"
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onClose}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Bot className="h-4.5 w-4.5" />
            </span>
            CROO Hub
          </Link>
          <button onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  active ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </motion.div>
    </div>
  );
}
