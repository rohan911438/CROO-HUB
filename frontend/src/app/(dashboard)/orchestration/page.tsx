'use client';

import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  Connection, Edge, Node, ReactFlowProvider, ReactFlowInstance, BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import {
  Workflow, Search, ShieldCheck, Link2, ScanText, Languages, Database, Play, Save,
  LayoutTemplate, Trash2, Plus, Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { StudioNode } from '@/components/orchestration/studio-node';
import { mockAgents, mockTemplates } from '@/lib/mock-data';
import { toast } from 'sonner';

const nodeTypes = { studioNode: StudioNode };

const palette = [
  { type: 'planner', label: 'Planner Agent', icon: Workflow, agentSlug: 'nomad-planner-agent' },
  { type: 'research', label: 'Research Agent', icon: Search, agentSlug: 'atlas-research-agent' },
  { type: 'verification', label: 'Verification Agent', icon: ShieldCheck, agentSlug: 'sentinel-verification-agent' },
  { type: 'blockchain', label: 'Blockchain Agent', icon: Link2, agentSlug: 'ledger-blockchain-agent' },
  { type: 'ocr', label: 'OCR Agent', icon: ScanText, agentSlug: 'optix-ocr-agent' },
  { type: 'translation', label: 'Translation Agent', icon: Languages, agentSlug: 'lexicon-translation-agent' },
  { type: 'storage', label: 'Storage Agent', icon: Database, agentSlug: 'vault-storage-agent' },
  { type: 'security', label: 'Security Agent', icon: ShieldCheck, agentSlug: 'warden-security-agent' },
];

const initialNodes: Node[] = [
  { id: 'n1', type: 'studioNode', position: { x: 40, y: 120 }, data: { type: 'planner', label: 'Planner Agent', agentSlug: 'nomad-planner-agent' } },
  { id: 'n2', type: 'studioNode', position: { x: 340, y: 40 }, data: { type: 'research', label: 'Research Agent', agentSlug: 'atlas-research-agent' } },
  { id: 'n3', type: 'studioNode', position: { x: 340, y: 200 }, data: { type: 'verification', label: 'Verification Agent', agentSlug: 'sentinel-verification-agent' } },
  { id: 'n4', type: 'studioNode', position: { x: 640, y: 120 }, data: { type: 'storage', label: 'Storage Agent', agentSlug: 'vault-storage-agent' } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e2', source: 'n1', target: 'n3', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e3', source: 'n2', target: 'n4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
  { id: 'e4', source: 'n3', target: 'n4', animated: true, style: { stroke: 'hsl(var(--primary))' } },
];

let idCounter = 5;

export default function OrchestrationPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('Weekly Competitive Research');
  const [logs, setLogs] = useState<{ level: string; message: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges],
  );

  function addNode(type: string, label: string, agentSlug: string) {
    const id = `n${idCounter++}`;
    setNodes((nds) => [
      ...nds,
      { id, type: 'studioNode', position: { x: 200 + Math.random() * 300, y: 120 + Math.random() * 200 }, data: { type, label, agentSlug } },
    ]);
  }

  function removeSelected() {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }

  function updateSelectedAgent(agentSlug: string) {
    if (!selectedNode) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, agentSlug } } : n)));
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, agentSlug } } : prev));
  }

  function updateSelectedLabel(label: string) {
    if (!selectedNode) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n)));
    setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, label } } : prev));
  }

  function runSimulation() {
    setRunning(true);
    setLogs([]);
    const order = nodes;
    order.forEach((node, i) => {
      setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          { level: 'info', message: `Step ${i + 1}/${order.length} — "${node.data.label}" executed successfully (mocked).` },
        ]);
        if (i === order.length - 1) {
          setTimeout(() => {
            setLogs((prev) => [...prev, { level: 'success', message: 'Workflow run completed (simulation).' }]);
            setRunning(false);
          }, 500);
        }
      }, i * 700);
    });
  }

  function saveWorkflow() {
    toast.success('Workflow saved', { description: `"${workflowName}" persisted to MongoDB (mocked).` });
  }

  function loadTemplate(slug: string) {
    const t = mockTemplates.find((tpl) => tpl.slug === slug);
    if (!t) return;
    setWorkflowName(t.name);
    toast.success(`Loaded "${t.name}"`, { description: 'Template duplicated into a new draft workflow.' });
    setTemplateOpen(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} className="max-w-xs font-medium" />
        <Badge variant="secondary">Draft</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate className="h-4 w-4" /> Templates
          </Button>
          <Button variant="outline" onClick={saveWorkflow}>
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button variant="gradient" onClick={runSimulation} disabled={running}>
            <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run simulation'}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        <Card className="col-span-12 overflow-y-auto p-3 lg:col-span-2">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent nodes</div>
          <div className="space-y-2">
            {palette.map((p) => (
              <button
                key={p.type}
                onClick={() => addNode(p.type, p.label, p.agentSlug)}
                className="flex w-full items-center gap-2 rounded-lg border border-border p-2.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <p.icon className="h-4 w-4 text-primary" />
                <span className="flex-1">{p.label}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="relative col-span-12 min-h-[420px] overflow-hidden p-0 lg:col-span-7">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(instance) => (rfInstance.current = instance)}
              onNodeClick={(_, node) => setSelectedNode(node)}
              onPaneClick={() => setSelectedNode(null)}
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
        </Card>

        <Card className="col-span-12 flex flex-col overflow-hidden p-0 lg:col-span-3">
          {selectedNode ? (
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Node configuration</span>
                <Button variant="ghost" size="icon" onClick={removeSelected}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input value={selectedNode.data.label} onChange={(e) => updateSelectedLabel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned agent</Label>
                  <Select value={selectedNode.data.agentSlug} onValueChange={updateSelectedAgent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mockAgents.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Parameters (JSON)</Label>
                  <Textarea defaultValue={'{\n  "timeout_ms": 30000,\n  "retries": 2\n}'} className="min-h-[100px] font-mono text-xs" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Terminal className="h-4 w-4" /> Execution logs
              </div>
              <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Run a simulation or select a node to configure it.</p>
                ) : (
                  logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className={log.level === 'success' ? 'text-success' : 'text-primary'}>●</span>
                      <span className="text-muted-foreground">{log.message}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template gallery</DialogTitle>
            <DialogDescription>Start from a proven pipeline and customize it.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-96 gap-3 overflow-y-auto scrollbar-thin sm:grid-cols-2">
            {mockTemplates.map((t) => (
              <button
                key={t.slug}
                onClick={() => loadTemplate(t.slug)}
                className="rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.featured && <Badge variant="default">Featured</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{t.usageCount} uses</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
