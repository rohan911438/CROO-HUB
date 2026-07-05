import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import {
  Workflow, Search, ShieldCheck, Link2, ScanText, Languages, Database, LucideIcon,
} from 'lucide-react';

export const nodeIcons: Record<string, LucideIcon> = {
  planner: Workflow,
  research: Search,
  verification: ShieldCheck,
  blockchain: Link2,
  ocr: ScanText,
  translation: Languages,
  storage: Database,
  security: ShieldCheck,
  analytics: Search,
  content: Languages,
  extraction: ScanText,
};

export function StudioNode({ data, selected }: NodeProps) {
  const Icon = nodeIcons[data.type] ?? Workflow;

  return (
    <div
      className={cn(
        'w-52 rounded-xl border bg-card p-3 shadow-soft transition-colors',
        selected ? 'border-primary shadow-glow' : 'border-border',
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-primary !bg-background" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{data.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">{data.agentSlug ?? 'Unassigned'}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-primary !bg-background" />
    </div>
  );
}
