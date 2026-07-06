import { ethers } from 'ethers';
import { env } from '../../config/env';
import { ORCHESTRATION_METADATA_ABI } from './orchestrationMetadataAbi';

/**
 * Anchors immutable execution proofs for Agent Commerce orders on the already-deployed
 * OrchestrationMetadata contract (Base Sepolia - see blockchain/README.md). This is a
 * complementary trust layer, not a requirement of CAP itself: CAP settles entirely through
 * CROO's own infrastructure (see CROO_CAP_COMPATIBILITY_REPORT.md §2), so this anchoring never
 * blocks or gates an order's CAP-side progress - it only records, after the fact, a hash-based
 * proof of what CROO Hub's Planner did, on a chain CROO Hub already controls.
 */

let cachedProvider: ethers.JsonRpcProvider | null = null;
let cachedSigner: ethers.Wallet | null = null;
let cachedContract: ethers.Contract | null = null;

export function isAgentCommerceChainConfigured(): boolean {
  return env.agentCommerceChain.isConfigured;
}

/** The wallet address that signs anchoring transactions - i.e. the address recorded as the sole
 *  `participatingAgents` entry, since CROO Hub's MongoDB agents/users have no linked EVM wallet
 *  address of their own in this build (see notes in planner.service.ts). */
export function getAnchorSignerAddress(): string {
  return new ethers.Wallet(env.agentCommerceChain.signerPrivateKey).address;
}

function getContract(): ethers.Contract {
  if (!env.agentCommerceChain.isConfigured) {
    throw new Error('Agent Commerce chain anchoring is not configured');
  }
  if (!cachedContract) {
    cachedProvider = new ethers.JsonRpcProvider(env.agentCommerceChain.rpcUrl);
    cachedSigner = new ethers.Wallet(env.agentCommerceChain.signerPrivateKey, cachedProvider);
    cachedContract = new ethers.Contract(
      env.agentCommerceChain.orchestrationMetadataAddress,
      ORCHESTRATION_METADATA_ABI,
      cachedSigner,
    );
  }
  return cachedContract;
}

export enum OnchainExecutionStatus {
  Completed = 0,
  Failed = 1,
  Partial = 2,
}

export interface AnchorExecutionInput {
  workflowRef: string; // bytes32 hex, typically keccak256 of the AgentOrder's _id
  participatingAgents: string[]; // wallet addresses
  agentIds: number[]; // on-chain AgentRegistry ids, if known (else [])
  executionProofHash: string; // bytes32 hex
  completionHash: string; // bytes32 hex
  version: string;
  startedAt: number; // unix seconds
  completedAt: number; // unix seconds
  status: OnchainExecutionStatus;
}

export interface AnchorExecutionResult {
  executionId: string;
  txHash: string;
  blockNumber: number;
  explorerUrl: string;
}

/** Records one immutable execution proof. Throws on failure - callers should catch and degrade
 *  gracefully (an anchoring failure must never fail the underlying Agent Commerce order). */
export async function anchorExecution(input: AnchorExecutionInput): Promise<AnchorExecutionResult> {
  const contract = getContract();

  const tx = await contract.recordExecution(
    0, // templateId - ad-hoc Agent Commerce orders have no reusable template
    input.workflowRef,
    input.participatingAgents,
    input.agentIds,
    input.executionProofHash,
    input.completionHash,
    input.version,
    input.startedAt,
    input.completedAt,
    input.status,
  );
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error('recordExecution transaction did not confirm');
  }

  // Decode executionId directly from the receipt's own event log rather than issuing a follow-up
  // read call - a second `getExecutionIdByWorkflowRef` request can hit a different node behind a
  // load-balanced public RPC endpoint that hasn't yet observed the block just mined, silently
  // returning 0 (confirmed against sepolia.base.org during testing). The receipt is authoritative
  // and requires no extra round trip.
  const parsed = receipt.logs
    .map((log: ethers.Log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((log: ethers.LogDescription | null) => log?.name === 'WorkflowExecutionRecorded');

  if (!parsed) {
    throw new Error('recordExecution succeeded but its event log was not found in the receipt');
  }

  return {
    executionId: (parsed.args.executionId as bigint).toString(),
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: `https://sepolia.basescan.org/tx/${receipt.hash}`,
  };
}
