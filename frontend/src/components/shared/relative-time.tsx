'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

/**
 * "X minutes ago" text is inherently non-deterministic between server render and client
 * hydration (wall-clock time passes in between), which causes React hydration mismatches.
 * Render nothing on the server/first client paint, then fill in the relative string after
 * mount so server and client markup always agree on the first render.
 */
export function RelativeTime({ date, className }: { date: string | Date; className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatRelativeTime(date));
  }, [date]);

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? ' '}
    </span>
  );
}
