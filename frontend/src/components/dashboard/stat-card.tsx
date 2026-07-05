'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  index?: number;
}

export function StatCard({ label, value, change, icon: Icon, index = 0 }: StatCardProps) {
  const positive = (change ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          {change !== undefined && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
