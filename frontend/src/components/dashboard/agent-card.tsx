'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bookmark, Star, Zap, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge, AvailabilityDot } from './badges';
import { Agent } from '@/types';
import { formatNumber, initials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
  index?: number;
  bookmarked?: boolean;
  onToggleBookmark?: (slug: string) => void;
  compareSelected?: boolean;
  onToggleCompare?: (slug: string) => void;
}

export function AgentCard({ agent, index = 0, bookmarked, onToggleBookmark, compareSelected, onToggleCompare }: AgentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: (index % 12) * 0.03 }}
      whileHover={{ y: -3 }}
    >
      <Card className="group relative flex h-full flex-col p-5 transition-colors hover:border-primary/40">
        <button
          onClick={() => onToggleBookmark?.(agent.slug)}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Bookmark agent"
        >
          <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-primary text-primary')} />
        </button>

        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={agent.avatarUrl} alt={agent.name} />
            <AvatarFallback>{initials(agent.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pr-6">
            <Link href={`/marketplace/${agent.slug}`} className="font-semibold hover:underline">
              {agent.name}
            </Link>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{agent.tagline}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <VerificationBadge level={agent.verification} />
              <AvailabilityDot status={agent.availability} />
            </div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{agent.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <Badge key={cap} variant="outline" className="text-[11px]">
              {cap}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="outline" className="text-[11px]">
              +{agent.capabilities.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold">
              <Star className="h-3.5 w-3.5 text-warning" /> {agent.reputationScore}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Reputation</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {agent.performance.successRate}%
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Success</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-sm font-semibold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {(agent.performance.averageLatencyMs / 1000).toFixed(1)}s
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Avg latency</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">
              {agent.pricing.model === 'free' ? 'Free' : `$${agent.pricing.amount}`}
            </span>
            {agent.pricing.unit && agent.pricing.model !== 'free' && (
              <span className="text-xs text-muted-foreground"> /{agent.pricing.unit.replace('per ', '')}</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{formatNumber(agent.performance.completedJobs)} jobs</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" variant="gradient" className="flex-1">
            <Link href={`/marketplace/${agent.slug}`}>View profile</Link>
          </Button>
          {onToggleCompare && (
            <Button
              size="sm"
              variant={compareSelected ? 'secondary' : 'outline'}
              onClick={() => onToggleCompare(agent.slug)}
            >
              {compareSelected ? 'Added' : 'Compare'}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
