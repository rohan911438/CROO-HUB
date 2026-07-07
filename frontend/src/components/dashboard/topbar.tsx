'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDisconnect } from 'wagmi';
import { Bell, Menu, Search, Settings, LogOut, User, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { mockNotifications } from '@/lib/mock-data';
import { clearTokens } from '@/lib/auth';
import { MobileNav } from './mobile-nav';
import { WalletButton } from '@/components/shared/wallet-button';

const titles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/marketplace': 'Agent Marketplace',
  '/discovery': 'Discovery Engine',
  '/orchestration': 'Orchestration Studio',
  '/reputation': 'Reputation Center',
  '/templates': 'Workflow Templates',
  '/analytics': 'Analytics',
  '/transactions': 'Transactions',
  '/api-keys': 'API Keys',
  '/dev-console': 'Developer Console',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/help': 'Help Center',
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const unread = mockNotifications.filter((n) => !n.isRead).length;

  useEffect(() => setMounted(true), []);

  const title =
    Object.entries(titles).find(([href]) => pathname === href || pathname?.startsWith(href + '/'))?.[1] ??
    'Dashboard';

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/60 bg-background/70 px-4 glass sm:px-6">
        <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base font-semibold tracking-tight">{title}</h1>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search agents, workflows…" className="h-9 w-64 pl-9" />
          </div>

          <WalletButton compact />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4.5 w-4.5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unread > 0 && <Badge variant="default">{unread} new</Badge>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mockNotifications.slice(0, 4).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/notifications" className="justify-center text-sm text-primary">
                  View all notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=jordan-reyes" alt="Jordan Reyes" />
                  <AvatarFallback>JR</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Jordan Reyes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><User className="h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings"><Settings className="h-4 w-4" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  clearTokens();
                  disconnect();
                  router.push('/');
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}
    </>
  );
}
