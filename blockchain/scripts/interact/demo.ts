/**
 * End-to-end interaction demo against an already-deployed CROO Hub stack.
 * Registers an agent, runs a full escrow settlement, submits a review, and
 * records a workflow execution proof - printing each step's result.
 *
 * Requires a prior `npm run deploy:<network>` on the target network, and at
 * least two funded signers (buyer needs MockUSDC + ETH for gas if using MockUSDC).
 *
 * Usage:
 *   npx hardhat run scripts/interact/demo.ts --network localhost
 *   npx hardhat run scripts/interact/demo.ts --network baseSepolia
 */
import { ethers, network } from "hardhat";
import { loadDeployment } from "../utils/deploymentStore";

async function main() {
  const record = loadDeployment(network.name);
  const [deployer, agentOwner, buyer] = await ethers.getSigners();

  const agentRegistry = await ethers.getContractAt("AgentRegistry", record.contracts.AgentRegistry.address);
  const escrow = await ethers.getContractAt("EscrowCommerce", record.contracts.EscrowCommerce.address);
  const reputation = await ethers.getContractAt("Reputation", record.contracts.Reputation.address);
  const orchestration = await ethers.getContractAt(
    "OrchestrationMetadata",
    record.contracts.OrchestrationMetadata.address,
  );

  if (!record.contracts.MockUSDC) {
    throw new Error("This demo mints MockUSDC; deploy without USDC_ADDRESS set to use it.");
  }
  const usdc = await ethers.getContractAt("MockUSDC", record.contracts.MockUSDC.address);

  console.log("1. Registering agent...");
  const registerTx = await agentRegistry.connect(agentOwner).registerAgent({
    name: "ResearchBot",
    description: "Autonomous competitive research agent",
    category: "research",
    capabilities: ["web-search", "summarization"],
    pricingModel: 1,
    protocols: ["MCP", "REST"],
    chains: ["base-sepolia"],
    metadataURI: "ipfs://bafy-example-metadata",
    endpointHash: ethers.keccak256(ethers.toUtf8Bytes("https://agents.croohub.ai/researchbot")),
    version: "1.0.0",
  });
  await registerTx.wait();
  const agentId = await agentRegistry.totalAgents();
  console.log(`   agentId = ${agentId}`);

  console.log("2. Funding buyer with MockUSDC and approving escrow...");
  await (await usdc.connect(deployer).mint(buyer.address, 1_000n * 10n ** 6n)).wait();
  await (await usdc.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256)).wait();

  console.log("3. Creating escrow...");
  const amount = 100n * 10n ** 6n; // 100 USDC
  const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const workflowRef = ethers.keccak256(ethers.toUtf8Bytes(`demo-workflow-${Date.now()}`));
  const createTx = await escrow.connect(buyer).createEscrow(agentId, amount, deadline, workflowRef);
  await createTx.wait();
  console.log(`   escrow created (tx ${createTx.hash})`);

  console.log("4. Agent accepts, completes, buyer releases...");
  await (await escrow.connect(agentOwner).acceptEscrow(1)).wait();
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes("off-chain execution trace"));
  await (await escrow.connect(agentOwner).markCompleted(1, proofHash)).wait();
  await (await escrow.connect(buyer).releasePayment(1)).wait();
  console.log("   payment released");

  console.log("5. Reputation summary after settlement:");
  console.log(await reputation.getReputationSummary(agentId));

  console.log("6. Buyer submits a review...");
  await (await reputation.connect(buyer).submitReview(1, 5)).wait();

  console.log("7. Recording workflow execution proof...");
  const now = Math.floor(Date.now() / 1000);
  await (
    await orchestration
      .connect(buyer)
      .recordExecution(0, workflowRef, [agentOwner.address], [agentId], proofHash, proofHash, "1.0.0", now - 60, now, 0)
  ).wait();
  console.log("   execution recorded");

  console.log("\nDemo complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
