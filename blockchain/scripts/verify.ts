/**
 * Verifies every contract in the current network's deployment record on Basescan.
 *
 * Usage:
 *   npm run verify:baseSepolia
 */
import { network, run } from "hardhat";
import { loadDeployment } from "./utils/deploymentStore";

async function verifyOne(name: string, address: string, constructorArguments: unknown[]) {
  console.log(`\nVerifying ${name} at ${address}...`);
  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`${name} verified.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`${name} was already verified.`);
    } else {
      console.error(`Failed to verify ${name}: ${message}`);
    }
  }
}

async function main() {
  const record = loadDeployment(network.name);

  if (record.contracts.MockUSDC) {
    await verifyOne("MockUSDC", record.contracts.MockUSDC.address, record.contracts.MockUSDC.args);
  }
  await verifyOne("AgentRegistry", record.contracts.AgentRegistry.address, record.contracts.AgentRegistry.args);
  await verifyOne("Reputation", record.contracts.Reputation.address, record.contracts.Reputation.args);
  await verifyOne("EscrowCommerce", record.contracts.EscrowCommerce.address, record.contracts.EscrowCommerce.args);
  await verifyOne(
    "OrchestrationMetadata",
    record.contracts.OrchestrationMetadata.address,
    record.contracts.OrchestrationMetadata.args,
  );

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
