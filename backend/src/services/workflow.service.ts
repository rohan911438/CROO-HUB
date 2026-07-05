import { Workflow, IWorkflowEdge, IWorkflowNode } from '../models/Workflow';
import { AppError } from '../utils/AppError';

interface SaveWorkflowInput {
  owner: string;
  name: string;
  description?: string;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  templateSource?: string;
}

export async function listWorkflows(owner: string) {
  return Workflow.find({ owner }).sort({ updatedAt: -1 });
}

export async function getWorkflow(id: string, owner: string) {
  const workflow = await Workflow.findOne({ _id: id, owner });
  if (!workflow) throw AppError.notFound('Workflow not found');
  return workflow;
}

export async function createWorkflow(input: SaveWorkflowInput) {
  return Workflow.create({ ...input, status: 'saved' });
}

export async function updateWorkflow(id: string, owner: string, input: Partial<SaveWorkflowInput>) {
  const workflow = await Workflow.findOneAndUpdate({ _id: id, owner }, input, { new: true });
  if (!workflow) throw AppError.notFound('Workflow not found');
  return workflow;
}

export async function deleteWorkflow(id: string, owner: string) {
  const workflow = await Workflow.findOneAndDelete({ _id: id, owner });
  if (!workflow) throw AppError.notFound('Workflow not found');
  return workflow;
}

/**
 * Mocked execution engine — simulates a run by generating a plausible
 * per-node execution log and returns immediately. Real orchestration
 * (agent dispatch, CROO CAP settlement) will replace this simulation.
 */
export async function simulateExecution(id: string, owner: string) {
  const workflow = await Workflow.findOne({ _id: id, owner });
  if (!workflow) throw AppError.notFound('Workflow not found');

  const logs = workflow.nodes.map((node, i) => ({
    timestamp: new Date(Date.now() + i * 800),
    level: 'info',
    message: `Step ${i + 1}/${workflow.nodes.length} — "${node.label}" executed successfully (mocked).`,
  }));

  logs.push({
    timestamp: new Date(Date.now() + workflow.nodes.length * 800 + 500),
    level: 'success',
    message: 'Workflow run completed (simulation). Connect real orchestration to execute live.',
  });

  workflow.executionLogs.push(...logs);
  workflow.lastRunAt = new Date();
  workflow.runCount += 1;
  await workflow.save();

  return { workflow, logs };
}
