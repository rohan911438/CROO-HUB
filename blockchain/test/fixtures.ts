import { ethers } from "hardhat";

/** Sample AgentRegistry.AgentInput tuple, overridable per test. */
export function sampleAgentInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "ResearchBot",
    description: "Autonomous competitive research agent",
    category: "research",
    capabilities: ["web-search", "summarization"],
    pricingModel: 1, // PayPerUse
    protocols: ["MCP", "REST"],
    chains: ["base-sepolia"],
    metadataURI: "ipfs://bafy-example-metadata",
    endpointHash: ethers.keccak256(ethers.toUtf8Bytes("https://agents.croohub.ai/researchbot")),
    version: "1.0.0",
    ...overrides,
  };
}

export const ONE_USDC = 10n ** 6n;

export async function deployFixture() {
  const [admin, agentOwner, buyer, arbitratorExtra, other] = await ethers.getSigners();

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy(admin.address);

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(admin.address);

  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(admin.address, await agentRegistry.getAddress());

  const EscrowCommerce = await ethers.getContractFactory("EscrowCommerce");
  const escrow = await EscrowCommerce.deploy(
    admin.address,
    await usdc.getAddress(),
    await agentRegistry.getAddress(),
    await reputation.getAddress(),
    admin.address,
    0,
  );

  const OrchestrationMetadata = await ethers.getContractFactory("OrchestrationMetadata");
  const orchestration = await OrchestrationMetadata.deploy(admin.address, await agentRegistry.getAddress());

  const RECORDER_ROLE = await reputation.RECORDER_ROLE();
  await reputation.connect(admin).grantRole(RECORDER_ROLE, await escrow.getAddress());

  // Fund buyer with mock USDC and pre-approve the escrow contract.
  await usdc.connect(admin).mint(buyer.address, 10_000n * ONE_USDC);
  await usdc.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);

  return {
    admin,
    agentOwner,
    buyer,
    arbitratorExtra,
    other,
    usdc,
    agentRegistry,
    reputation,
    escrow,
    orchestration,
  };
}

export async function registerSampleAgent(agentRegistry: any, owner: any, overrides: Partial<Record<string, unknown>> = {}) {
  const tx = await agentRegistry.connect(owner).registerAgent(sampleAgentInput(overrides));
  await tx.wait();
  return agentRegistry.totalAgents();
}
