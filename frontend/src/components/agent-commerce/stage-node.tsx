import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Circle } from 'lucide-react';

export type StageStatus = 'pending' | 'active' | 'done' | 'warning' | 'error';

const STATUS_STYLE: Record<StageStatus, string> = {
  pending: 'border-border bg-card text-muted-foreground',
  active: 'border-primary bg-primary/5 text-foreground shadow-glow',
  done: 'border-success/50 bg-success/5 text-foreground',
  warning: 'border-warning/50 bg-warning/5 text-foreground',
  error: 'border-destructive/50 bg-destructive/5 text-foreground',
};

const STATUS_ICON: Record<StageStatus, typeof Circle> = {
  pending: Circle,
  active: Loader2,
  done: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export interface StageNodeData {
  label: string;
  status: StageStatus;
  timestamp?: string;
  durationLabel?: string;
}

export function StageNode({ data }: NodeProps<StageNodeData>) {
  const Icon = STATUS_ICON[data.status];
  return (
    <div className={cn('w-40 rounded-xl border p-2.5 shadow-soft transition-colors', STATUS_STYLE[data.status])}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-primary !bg-background" />
      <div className="flex items-center gap-2">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', data.status === 'active' && 'animate-spin')} />
        <span className="truncate text-xs font-medium">{data.label}</span>
      </div>
      {data.timestamp && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {new Date(data.timestamp).toLocaleTimeString()}
          {data.durationLabel ? ` · ${data.durationLabel}` : ''}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-primary !bg-background" />
    </div>
  );
}
