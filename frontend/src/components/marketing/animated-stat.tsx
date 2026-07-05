'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { formatNumber } from '@/lib/utils';

interface AnimatedStatProps {
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
  compact?: boolean;
}

export function AnimatedStat({ value, label, suffix = '', decimals = 0, compact }: AnimatedStatProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  const formatted = compact
    ? formatNumber(display)
    : display.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });

  return (
    <div ref={ref}>
      <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {formatted}
        {suffix}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
