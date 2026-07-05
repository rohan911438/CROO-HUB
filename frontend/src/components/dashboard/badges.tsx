import { BadgeCheck, ShieldCheck, Sparkles, CircleDashed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Availability, Verification } from '@/types';

export function VerificationBadge({ level }: { level: Verification }) {
  const map: Record<Verification, { label: string; variant: 'default' | 'secondary' | 'success'; icon: typeof BadgeCheck }> = {
    unverified: { label: 'Unverified', variant: 'secondary', icon: CircleDashed },
    community: { label: 'Community', variant: 'secondary', icon: Sparkles },
    verified: { label: 'Verified', variant: 'default', icon: BadgeCheck },
    enterprise: { label: 'Enterprise', variant: 'success', icon: ShieldCheck },
  };
  const { label, variant, icon: Icon } = map[level];

  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

export function AvailabilityDot({ status }: { status: Availability }) {
  const colors: Record<Availability, string> = {
    online: 'bg-success',
    busy: 'bg-warning',
    offline: 'bg-muted-foreground',
  };
  const labels: Record<Availability, string> = {
    online: 'Online',
    busy: 'Busy',
    offline: 'Offline',
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('h-1.5 w-1.5 rounded-full', colors[status])} />
      {labels[status]}
    </span>
  );
}
