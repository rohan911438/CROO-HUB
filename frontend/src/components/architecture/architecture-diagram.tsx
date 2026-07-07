'use client';

import ReactFlow, {
  Background, BackgroundVariant, Controls, Node, Edge, ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LayerNode } from './layer-node';

const nodeTypes = { layer: LayerNode };

export function ArchitectureDiagram({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (nodeId: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
        <Controls className="!bottom-4 !left-4" showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
