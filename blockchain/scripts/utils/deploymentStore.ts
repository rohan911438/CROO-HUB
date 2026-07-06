import * as fs from "fs";
import * as path from "path";

/** Shape persisted to deployments/<network>.json after a successful deploy. */
export interface DeploymentRecord {
  network: string;
  chainId: number;
  deployer: string;
  admin: string;
  deployedAt: string;
  contracts: {
    MockUSDC?: { address: string; args: unknown[] };
    AgentRegistry: { address: string; args: unknown[] };
    Reputation: { address: string; args: unknown[] };
    EscrowCommerce: { address: string; args: unknown[] };
    OrchestrationMetadata: { address: string; args: unknown[] };
  };
}

const DEPLOYMENTS_DIR = path.join(__dirname, "..", "..", "deployments");

export function deploymentPath(network: string): string {
  return path.join(DEPLOYMENTS_DIR, `${network}.json`);
}

export function saveDeployment(record: DeploymentRecord): string {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }
  const file = deploymentPath(record.network);
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return file;
}

export function loadDeployment(network: string): DeploymentRecord {
  const file = deploymentPath(network);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No deployment record found at ${file}. Run \`npm run deploy:${network}\` first.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as DeploymentRecord;
}
