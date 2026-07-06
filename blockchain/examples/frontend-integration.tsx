/**
 * CROO Hub frontend integration example (wagmi v2 + viem + RainbowKit).
 *
 * This mirrors the actual stack already installed in ../../frontend (see
 * frontend/src/lib/wagmi.ts and frontend/src/components/shared/web3-provider.tsx, which already
 * wrap the app in WagmiProvider/RainbowKitProvider on Base Sepolia). Copy the hooks below into
 * frontend/src/hooks/ (e.g. useAgentRegistry.ts, useEscrow.ts) and the address/ABI config into
 * frontend/src/lib/contracts.ts - this file just demonstrates the shape and is not built directly.
 *
 * Design note: the frontend talks to contracts directly with the connected wallet as signer.
 * The Express backend (see backend-integration.ts) never signs on the user's behalf; it only
 * indexes events for fast reads. Writes always originate from the user's own wallet here.
 */
import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Address, keccak256, toBytes, zeroHash } from "viem";

// ---------------------------------------------------------------------------
// 0. Config - copy into frontend/src/lib/contracts.ts. Addresses come from
//    blockchain/deployments/baseSepolia.json after `npm run deploy:baseSepolia`.
// ---------------------------------------------------------------------------

import AgentRegistryAbi from "../artifacts/contracts/AgentRegistry.sol/AgentRegistry.json";
import EscrowCommerceAbi from "../artifacts/contracts/EscrowCommerce.sol/EscrowCommerce.json";
import ReputationAbi from "../artifacts/contracts/Reputation.sol/Reputation.json";
import ERC20Abi from "../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json";

export const CONTRACTS = {
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as Address,
  escrowCommerce: process.env.NEXT_PUBLIC_ESCROW_COMMERCE_ADDRESS as Address,
  reputation: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS as Address,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as Address,
};

// ---------------------------------------------------------------------------
// 1. Reads - frontend/src/hooks/useAgentRegistry.ts
// ---------------------------------------------------------------------------

export function useAgent(agentId?: bigint) {
  return useReadContract({
    address: CONTRACTS.agentRegistry,
    abi: AgentRegistryAbi.abi,
    functionName: "getAgent",
    args: agentId !== undefined ? [agentId] : undefined,
    query: { enabled: agentId !== undefined },
  });
}

export function useAgentReputation(agentId?: bigint) {
  const { data, ...rest } = useReadContract({
    address: CONTRACTS.reputation,
    abi: ReputationAbi.abi,
    functionName: "getReputationSummary",
    args: agentId !== undefined ? [agentId] : undefined,
    query: { enabled: agentId !== undefined },
  });

  const formatted = useMemo(() => {
    if (!data) return undefined;
    const rep = data as { completedJobs: bigint; reputationScore: bigint; trustScore: bigint };
    return {
      completedJobs: Number(rep.completedJobs),
      reputationScorePct: Number(rep.reputationScore) / 100,
      trustScorePct: Number(rep.trustScore) / 100,
    };
  }, [data]);

  return { data: formatted, raw: data, ...rest };
}

// ---------------------------------------------------------------------------
// 2. Write: register an agent - frontend/src/hooks/useRegisterAgent.ts
// ---------------------------------------------------------------------------

export interface RegisterAgentInput {
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  pricingModel: 0 | 1 | 2 | 3; // Free, PayPerUse, Subscription, Custom
  protocols: string[];
  chains: string[];
  metadataURI: string;
  version: string;
}

export function useRegisterAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function registerAgent(input: RegisterAgentInput) {
    writeContract({
      address: CONTRACTS.agentRegistry,
      abi: AgentRegistryAbi.abi,
      functionName: "registerAgent",
      args: [
        {
          ...input,
          endpointHash: keccak256(toBytes(input.metadataURI)),
        },
      ],
    });
  }

  return { registerAgent, hash, isPending, isConfirming, isSuccess, error };
}

// ---------------------------------------------------------------------------
// 3. Write: fund a service request - frontend/src/hooks/useCreateEscrow.ts
//    Two-step flow: USDC approve() then EscrowCommerce.createEscrow().
// ---------------------------------------------------------------------------

export function useCreateEscrow() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  async function createEscrow(params: { agentId: bigint; amountUsdc: string; deadline: Date; workflowId?: `0x${string}` }) {
    if (!address) throw new Error("Connect a wallet first");
    const amount = parseUnits(params.amountUsdc, 6); // USDC has 6 decimals

    const approveHash = await writeContractAsync({
      address: CONTRACTS.usdc,
      abi: ERC20Abi.abi,
      functionName: "approve",
      args: [CONTRACTS.escrowCommerce, amount],
    });

    const createHash = await writeContractAsync({
      address: CONTRACTS.escrowCommerce,
      abi: EscrowCommerceAbi.abi,
      functionName: "createEscrow",
      args: [
        params.agentId,
        amount,
        BigInt(Math.floor(params.deadline.getTime() / 1000)),
        params.workflowId ?? zeroHash,
      ],
    });

    return { approveHash, createHash };
  }

  return { createEscrow };
}

// ---------------------------------------------------------------------------
// 4. Example component using the hooks above.
// ---------------------------------------------------------------------------

export function AgentReputationCard({ agentId }: { agentId: bigint }) {
  const { data: agent } = useAgent(agentId);
  const { data: reputation } = useAgentReputation(agentId);

  if (!agent) return null;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{(agent as { name: string }).name}</h3>
      <p className="text-sm text-muted-foreground">
        {reputation ? `${reputation.reputationScorePct.toFixed(1)}% reputation` : "Loading reputation..."}
      </p>
      <p className="text-xs text-muted-foreground">{reputation?.completedJobs ?? 0} completed jobs</p>
    </div>
  );
}
