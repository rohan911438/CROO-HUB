/**
 * Deploys the full CROO Hub on-chain trust layer in dependency order and wires the
 * inter-contract references/roles automatically:
 *
 *   1. MockUSDC            (only if USDC_ADDRESS is not set in the environment)
 *   2. AgentRegistry        (no dependencies)
 *   3. Reputation           (depends on AgentRegistry, for agent-id validation)
 *   4. EscrowCommerce       (depends on USDC, AgentRegistry, Reputation)
 *   5. OrchestrationMetadata(depends on AgentRegistry, for optional agentId validation)
 *   6. Post-deploy: grants RECORDER_ROLE on Reputation to EscrowCommerce.
 *
 * Usage:
 *   npm run deploy:localhost
 *   npm run deploy:baseSepolia
 */
import { ethers, network } from "hardhat";
import { saveDeployment } from "./utils/deploymentStore";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const adminAddress = process.env.ADMIN_ADDRESS?.trim() || deployer.address;
  const feeRecipient = process.env.FEE_RECIPIENT?.trim() || adminAddress;
  const feeBps = Number(process.env.PROTOCOL_FEE_BPS ?? "0");
  const configuredUsdc = process.env.USDC_ADDRESS?.trim();

  console.log(`\nDeploying CROO Hub contracts to network "${network.name}" (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin:    ${adminAddress}`);
  console.log(`Fee:      ${feeBps} bps -> ${feeRecipient}\n`);

  // 1. USDC ---------------------------------------------------------------
  let usdcAddress: string;
  let mockUsdcArgs: unknown[] | undefined;
  if (configuredUsdc) {
    usdcAddress = configuredUsdc;
    console.log(`Using existing USDC token at ${usdcAddress}`);
  } else {
    console.log("USDC_ADDRESS not set - deploying MockUSDC for testing...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy(deployer.address);
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    mockUsdcArgs = [deployer.address];
    console.log(`MockUSDC deployed at ${usdcAddress}`);
  }

  // 2. AgentRegistry --------------------------------------------------------
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(adminAddress);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log(`AgentRegistry deployed at ${agentRegistryAddress}`);

  // 3. Reputation -----------------------------------------------------------
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(adminAddress, agentRegistryAddress);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`Reputation deployed at ${reputationAddress}`);

  // 4. EscrowCommerce ---------------------------------------------------------
  const EscrowCommerce = await ethers.getContractFactory("EscrowCommerce");
  const escrow = await EscrowCommerce.deploy(
    adminAddress,
    usdcAddress,
    agentRegistryAddress,
    reputationAddress,
    feeRecipient,
    feeBps,
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`EscrowCommerce deployed at ${escrowAddress}`);

  // 5. OrchestrationMetadata --------------------------------------------------
  const OrchestrationMetadata = await ethers.getContractFactory("OrchestrationMetadata");
  const orchestration = await OrchestrationMetadata.deploy(adminAddress, agentRegistryAddress);
  await orchestration.waitForDeployment();
  const orchestrationAddress = await orchestration.getAddress();
  console.log(`OrchestrationMetadata deployed at ${orchestrationAddress}`);

  // 6. Wire roles -------------------------------------------------------------
  console.log("\nWiring roles...");
  const RECORDER_ROLE = await reputation.RECORDER_ROLE();
  const grantTx = await reputation.connect(deployer).grantRole(RECORDER_ROLE, escrowAddress);
  await grantTx.wait();
  console.log(`Granted RECORDER_ROLE on Reputation to EscrowCommerce (${escrowAddress})`);

  if (adminAddress.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log(
      `NOTE: admin (${adminAddress}) differs from deployer (${deployer.address}). ` +
        "The deployer retains no privileged roles once admin-only functions are called by the admin; " +
        "grantRole above was executed by the deployer as the contract's initial DEFAULT_ADMIN_ROLE holder.",
    );
  }

  const record = saveDeployment({
    network: network.name,
    chainId,
    deployer: deployer.address,
    admin: adminAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      ...(mockUsdcArgs ? { MockUSDC: { address: usdcAddress, args: mockUsdcArgs } } : {}),
      AgentRegistry: { address: agentRegistryAddress, args: [adminAddress] },
      Reputation: { address: reputationAddress, args: [adminAddress, agentRegistryAddress] },
      EscrowCommerce: {
        address: escrowAddress,
        args: [adminAddress, usdcAddress, agentRegistryAddress, reputationAddress, feeRecipient, feeBps],
      },
      OrchestrationMetadata: { address: orchestrationAddress, args: [adminAddress, agentRegistryAddress] },
    },
  });

  console.log(`\nDeployment record saved to ${record}`);
  console.log("\nNext steps:");
  console.log(`  1. npm run verify:${network.name === "hardhat" ? "baseSepolia" : network.name} (on a live network)`);
  console.log("  2. Point the backend's BLOCKCHAIN_* env vars at the addresses above.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
