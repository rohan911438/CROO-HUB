/**
 * CROO Hub backend integration example (ethers.js v6 + Express + Mongoose).
 *
 * This file is a reference, not a build target of the `blockchain` package - it shows how the
 * Express backend at ../../backend should read from and index the on-chain trust layer. Copy the
 * relevant pieces into backend/src/{services,routes} rather than importing this file directly,
 * since it intentionally has no dependency on the backend's actual Mongoose models.
 *
 * Boundary this file assumes (see blockchain/README.md "Backend synchronization strategy"):
 *   - The blockchain is the source of truth for identity, funds, reputation, and workflow proofs.
 *   - MongoDB is a fast, queryable *cache* of that on-chain state, kept in sync by listening to
 *     contract events - never by independently mutating trust-critical fields off-chain.
 *   - The backend NEVER holds user funds or signs transactions on a user's behalf; it only reads
 *     the chain and, where the backend itself is a party (e.g. an admin/verifier key), submits
 *     transactions using its own operator wallet.
 */
import { ethers } from "ethers";

// In the real backend these come from backend/src/config/env.ts + a copied ABI/address bundle,
// e.g. `blockchain/deployments/baseSepolia.json` and `blockchain/artifacts/contracts/**/*.json`
// published as an npm workspace package or copied at build time.
import AgentRegistryAbi from "../artifacts/contracts/AgentRegistry.sol/AgentRegistry.json";
import EscrowCommerceAbi from "../artifacts/contracts/EscrowCommerce.sol/EscrowCommerce.json";
import ReputationAbi from "../artifacts/contracts/Reputation.sol/Reputation.json";
import OrchestrationMetadataAbi from "../artifacts/contracts/OrchestrationMetadata.sol/OrchestrationMetadata.json";

interface ChainConfig {
  rpcUrl: string;
  agentRegistry: string;
  escrowCommerce: string;
  reputation: string;
  orchestrationMetadata: string;
}

function getContracts(config: ChainConfig) {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  return {
    provider,
    agentRegistry: new ethers.Contract(config.agentRegistry, AgentRegistryAbi.abi, provider),
    escrow: new ethers.Contract(config.escrowCommerce, EscrowCommerceAbi.abi, provider),
    reputation: new ethers.Contract(config.reputation, ReputationAbi.abi, provider),
    orchestration: new ethers.Contract(config.orchestrationMetadata, OrchestrationMetadataAbi.abi, provider),
  };
}

// ---------------------------------------------------------------------------
// 1. Read path: merge on-chain truth into an API response.
//    Maps onto backend/src/controllers/agent.controller.ts.
// ---------------------------------------------------------------------------

/** Mirrors the shape of backend/src/models/Agent.ts for illustration only. */
interface AgentDocShape {
  onChainId: number;
  reputationScore: number;
  performance: { successRate: number; averageLatencyMs: number; completedJobs: number };
  verification: "unverified" | "community" | "verified" | "enterprise";
  availability: "online" | "busy" | "offline";
}

async function getAgentMergedWithChain(
  contracts: ReturnType<typeof getContracts>,
  onChainId: number,
): Promise<AgentDocShape> {
  const [agent, reputationSummary] = await Promise.all([
    contracts.agentRegistry.getAgent(onChainId),
    contracts.reputation.getReputationSummary(onChainId),
  ]);

  const successRate =
    reputationSummary.completedJobs === 0n
      ? 0
      : Number((reputationSummary.successfulJobs * 10000n) / reputationSummary.completedJobs) / 100;

  return {
    onChainId,
    reputationScore: Number(reputationSummary.reputationScore) / 100, // bps -> 0-100 scale
    performance: {
      successRate,
      averageLatencyMs:
        reputationSummary.completedJobs === 0n
          ? 0
          : Number(reputationSummary.totalResponseLatency / reputationSummary.completedJobs) * 1000,
      completedJobs: Number(reputationSummary.completedJobs),
    },
    verification: agent.verified ? "verified" : "unverified",
    availability: agent.active && agent.available ? "online" : "offline",
  };
}

// ---------------------------------------------------------------------------
// 2. Event indexer: keep MongoDB in sync with chain state.
//    Run as a long-lived worker process (e.g. backend/src/workers/chainIndexer.ts), separate
//    from the request/response Express process, with its own restart/backoff supervision.
// ---------------------------------------------------------------------------

/** Pseudo-repository calls standing in for backend/src/repositories + Mongoose models. */
const db = {
  upsertAgentFromChain: async (onChainId: number, fields: Partial<AgentDocShape>) => {
    // e.g. Agent.findOneAndUpdate({ onChainId }, { $set: fields }, { upsert: true })
    console.log("[indexer] upsert agent", onChainId, fields);
  },
  upsertTransactionFromEscrow: async (escrowId: number, fields: Record<string, unknown>) => {
    // e.g. Transaction.findOneAndUpdate({ onChainEscrowId: escrowId }, { $set: fields }, { upsert: true })
    console.log("[indexer] upsert transaction", escrowId, fields);
  },
};

export function startChainIndexer(config: ChainConfig) {
  const contracts = getContracts(config);

  contracts.agentRegistry.on("AgentRegistered", async (agentId, owner, name, category) => {
    await db.upsertAgentFromChain(Number(agentId), {
      onChainId: Number(agentId),
      verification: "unverified",
      availability: "online",
    });
  });

  contracts.agentRegistry.on("AgentPaused", async (agentId) => {
    await db.upsertAgentFromChain(Number(agentId), { availability: "offline" });
  });

  contracts.agentRegistry.on("AgentReactivated", async (agentId) => {
    await db.upsertAgentFromChain(Number(agentId), { availability: "online" });
  });

  // Escrow lifecycle -> Transaction status, matching backend/src/models/Transaction.ts's
  // `status`/`settlementMethod`/`chainMeta` fields.
  contracts.escrow.on("EscrowCreated", async (escrowId, buyer, agentId, amount, deadline, workflowId) => {
    await db.upsertTransactionFromEscrow(Number(escrowId), {
      status: "escrow_hold",
      settlementMethod: "on_chain_pending",
      amount: Number(amount) / 1e6,
      "escrow.isEscrow": true,
      "escrow.heldAt": new Date(),
      "chainMeta.note": `Escrow #${escrowId} created on-chain for agent ${agentId}`,
    });
  });

  contracts.escrow.on("PaymentReleased", async (escrowId, to, amount, fee) => {
    await db.upsertTransactionFromEscrow(Number(escrowId), {
      status: "completed",
      "escrow.releasedAt": new Date(),
      "chainMeta.note": `Released ${amount} to ${to} (fee ${fee}) on-chain`,
    });
  });

  contracts.escrow.on("EscrowRefunded", async (escrowId) => {
    await db.upsertTransactionFromEscrow(Number(escrowId), { status: "refunded" });
  });

  // Reputation -> Agent.reputationScore / performance, driven only by verified settlements.
  contracts.reputation.on("ReputationUpdated", async (agentId, escrowId, success, reputationScore, trustScore) => {
    await db.upsertAgentFromChain(Number(agentId), {
      reputationScore: Number(reputationScore) / 100,
    });
  });

  // Orchestration proofs -> Workflow.executionProof, matching a future
  // backend/src/models/Workflow.ts extension (see blockchain/README.md roadmap).
  contracts.orchestration.on(
    "WorkflowExecutionRecorded",
    async (executionId, templateId, workflowRef, owner, executionProofHash, completionHash, status) => {
      console.log("[indexer] workflow execution recorded", {
        executionId: Number(executionId),
        workflowRef,
        status: Number(status),
      });
    },
  );

  console.log("[indexer] listening for CROO Hub contract events...");
  return () => {
    contracts.agentRegistry.removeAllListeners();
    contracts.escrow.removeAllListeners();
    contracts.reputation.removeAllListeners();
    contracts.orchestration.removeAllListeners();
  };
}

// ---------------------------------------------------------------------------
// 3. Express route example, e.g. backend/src/routes/agent.routes.ts
// ---------------------------------------------------------------------------
//
// router.get('/:id/onchain', asyncHandler(async (req, res) => {
//   const agent = await Agent.findById(req.params.id);
//   if (!agent?.onChainId) throw new AppError(404, 'Agent has no on-chain identity yet');
//   const merged = await getAgentMergedWithChain(contracts, agent.onChainId);
//   res.json(apiResponse.success(merged));
// }));

export { getContracts, getAgentMergedWithChain };
