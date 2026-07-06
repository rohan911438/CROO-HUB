import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type LayerCategory = 'client' | 'application' | 'data' | 'trust' | 'external';

const CATEGORY_STYLE: Record<LayerCategory, string> = {
  client: 'border-sky-500/40 bg-sky-500/5',
  application: 'border-primary/40 bg-primary/5',
  data: 'border-emerald-500/40 bg-emerald-500/5',
  trust: 'border-amber-500/40 bg-amber-500/5',
  external: 'border-fuchsia-500/40 bg-fuchsia-500/5',
};

export interface LayerNodeData {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  category: LayerCategory;
  selected?: boolean;
}

export function LayerNode({ data }: NodeProps<LayerNodeData>) {
  const Icon = data.icon;
  return (
    <div
      className={cn(
        'w-48 rounded-xl border p-3 shadow-soft transition-all',
        CATEGORY_STYLE[data.category],
        data.selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-primary !bg-background" />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-primary !bg-background" />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/60">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{data.label}</div>
          <div className="truncate text-[10px] text-muted-foreground">{data.sublabel}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-primary !bg-background" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-primary !bg-background" />
    </div>
  );
}
