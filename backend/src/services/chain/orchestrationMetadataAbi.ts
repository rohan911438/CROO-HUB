/**
 * Minimal ABI fragment for the deployed OrchestrationMetadata contract (see
 * ../../../../blockchain/contracts/OrchestrationMetadata.sol and
 * ../../../../blockchain/deployments/baseSepolia.json for the live address). Only the functions
 * the Agent Commerce anchoring flow actually calls are included, copied verbatim from the
 * compiled artifact rather than hand-written, so the encoding can never drift from the deployed
 * bytecode.
 */
export const ORCHESTRATION_METADATA_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'executionId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'templateId', type: 'uint256' },
      { indexed: true, internalType: 'bytes32', name: 'workflowRef', type: 'bytes32' },
      { indexed: false, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'bytes32', name: 'executionProofHash', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 'completionHash', type: 'bytes32' },
      { indexed: false, internalType: 'uint8', name: 'status', type: 'uint8' },
      { indexed: false, internalType: 'uint256', name: 'recordedAt', type: 'uint256' },
    ],
    name: 'WorkflowExecutionRecorded',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'templateId', type: 'uint256' },
      { internalType: 'bytes32', name: 'workflowRef', type: 'bytes32' },
      { internalType: 'address[]', name: 'participatingAgents', type: 'address[]' },
      { internalType: 'uint256[]', name: 'agentIds', type: 'uint256[]' },
      { internalType: 'bytes32', name: 'executionProofHash', type: 'bytes32' },
      { internalType: 'bytes32', name: 'completionHash', type: 'bytes32' },
      { internalType: 'string', name: 'version', type: 'string' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'completedAt', type: 'uint256' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
    ],
    name: 'recordExecution',
    outputs: [{ internalType: 'uint256', name: 'executionId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'executionId', type: 'uint256' }],
    name: 'getExecution',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'executionId', type: 'uint256' },
          { internalType: 'uint256', name: 'templateId', type: 'uint256' },
          { internalType: 'bytes32', name: 'workflowRef', type: 'bytes32' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'address[]', name: 'participatingAgents', type: 'address[]' },
          { internalType: 'uint256[]', name: 'agentIds', type: 'uint256[]' },
          { internalType: 'bytes32', name: 'executionProofHash', type: 'bytes32' },
          { internalType: 'bytes32', name: 'completionHash', type: 'bytes32' },
          { internalType: 'string', name: 'version', type: 'string' },
          { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'completedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'recordedAt', type: 'uint256' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
        ],
        internalType: 'struct IOrchestrationMetadata.WorkflowExecution',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'workflowRef', type: 'bytes32' }],
    name: 'getExecutionIdByWorkflowRef',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
