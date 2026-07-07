'use client';

import ReactFlow, {
  Background, Controls, MiniMap, BackgroundVariant,
  Connection, Edge, Node, NodeChange, EdgeChange, ReactFlowProvider, ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StudioNode } from './studio-node';

const nodeTypes = { studioNode: StudioNode };

export function OrchestrationCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onInit,
  onNodeClick,
  onPaneClick,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onInit: (instance: ReactFlowInstance) => void;
  onNodeClick: (node: Node) => void;
  onPaneClick: () => void;
}) {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onNodeClick={(_, node) => onNodeClick(node)}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
        <Controls className="!bottom-4 !left-4" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="hsl(var(--background) / 0.6)"
          nodeColor="hsl(var(--primary) / 0.6)"
          className="!bg-card"
        />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
