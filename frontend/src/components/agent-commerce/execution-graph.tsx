'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, BackgroundVariant, Node, Edge, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { ExternalLink } from 'lucide-react';
import { AgentOrder } from '@/types';
import { computeExecutionStages } from '@/lib/executionStages';
import { StageNode } from './stage-node';

const nodeTypes = { stage: StageNode };

export function ExecutionGraph({ order }: { order: AgentOrder }) {
  const stages = useMemo(() => computeExecutionStages(order), [order]);
  const [selectedKey, setSelectedKey] = useState<string | null>(stages.find((s) => s.status === 'active')?.key ?? null);

  const nodes: Node[] = useMemo(
    () =>
      stages.map((s, i) => ({
        id: s.key,
        type: 'stage',
        position: { x: i * 190, y: 0 },
        data: { label: s.label, status: s.status, timestamp: s.timestamp, durationLabel: s.durationLabel },
        draggable: false,
        selectable: true,
      })),
    [stages],
  );

  const edges: Edge[] = useMemo(
    () =>
      stages.slice(1).map((s, i) => {
        const prev = stages[i];
        const traversed = s.status !== 'pending';
        return {
          id: `${prev.key}-${s.key}`,
          source: prev.key,
          target: s.key,
          animated: s.status === 'active',
          style: { stroke: traversed ? 'hsl(var(--primary))' : 'hsl(var(--border))', strokeWidth: traversed ? 2 : 1 },
        };
      }),
    [stages],
  );

  const selected = stages.find((s) => s.key === selectedKey) ?? stages[stages.length - 1];

  return (
    <div className="space-y-2">
      <div className="h-32 overflow-hidden rounded-xl border border-border bg-muted/10">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedKey(node.id)}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            zoomOnScroll={false}
            panOnDrag
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--border))" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      {selected && (
        <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium">{selected.label}</span>
            {selected.timestamp && (
              <span className="text-muted-foreground">
                {new Date(selected.timestamp).toLocaleTimeString()}
                {selected.durationLabel ? ` · took ${selected.durationLabel}` : ''}
              </span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{selected.detail}</p>
          {selected.link && (
            <a href={selected.link} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-primary hover:underline">
              View proof <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
