import {
  APIError,
  isForbidden,
  isInvalidParams,
  isNotFound,
  isUnauthorized,
  type ListOptions,
} from '@croo-network/sdk';
import { env } from '../config/env';
import { getCapClient, isCapConfigured } from './cap/capClient';
import { Agent, IAgent } from '../models/Agent';
import { AppError } from '../utils/AppError';

export const CAP_PROTOCOL_VERSION = 'CAP v2 (Base mainnet, chain 8453)';

export interface CapStatus {
  configured: boolean;
  connected: boolean;
  protocolVersion: string;
  apiUrl: string;
  wsUrl: string;
  chainId: number;
  error?: string;
  checkedAt: string;
}

function describeCapError(err: unknown): string {
  if (isUnauthorized(err)) return 'Unauthorized - the configured CROO_SDK_KEY was rejected by api.croo.network';
  if (isForbidden(err)) return 'Forbidden - this CROO Agent is not permitted to perform that action';
  if (isNotFound(err)) return 'Not found on CROO Network';
  if (isInvalidParams(err)) return 'Invalid parameters sent to CAP';
  if (err instanceof APIError) return `CAP error ${err.code}: ${err.reason || err.message}`;
  return err instanceof Error ? err.message : 'Unknown CAP error';
}

/**
 * Health check used by the /cap/status endpoint and the frontend CROO Integration panel.
 * There is no dedicated "whoami"/health endpoint in the CAP SDK, so connectivity is verified
 * with a minimal, side-effect-free listOrders call - if the key is invalid this throws
 * isUnauthorized, which we surface as `connected: false` with a diagnostic message rather than
 * letting the request fail outright (a misconfigured/unreachable CAP should never take down the
 * rest of CROO Hub's API).
 */
export async function getCapStatus(): Promise<CapStatus> {
  const base = {
    protocolVersion: CAP_PROTOCOL_VERSION,
    apiUrl: env.croo.apiUrl,
    wsUrl: env.croo.wsUrl,
    chainId: 8453,
    checkedAt: new Date().toISOString(),
  };

  if (!isCapConfigured()) {
    return { ...base, configured: false, connected: false };
  }

  try {
    const client = getCapClient();
    // The SDK types `role` as optional, but the live API rejects /orders and /negotiations list
    // calls without one (confirmed against api.croo.network) - 'provider' matches how CROO Hub's
    // configured Agent identity is expected to be registered (selling services), so it's the
    // safe default for a connectivity check.
    await client.listOrders({ pageSize: 1, role: 'provider' });
    return { ...base, configured: true, connected: true };
  } catch (err) {
    return { ...base, configured: true, connected: false, error: describeCapError(err) };
  }
}

export async function listCapOrders(opts?: ListOptions) {
  try {
    return await getCapClient().listOrders(opts);
  } catch (err) {
    throw AppError.badRequest(describeCapError(err));
  }
}

export async function listCapNegotiations(opts?: ListOptions) {
  try {
    return await getCapClient().listNegotiations(opts);
  } catch (err) {
    throw AppError.badRequest(describeCapError(err));
  }
}

export interface RegistrationGuide {
  dashboardUrl: string;
  steps: string[];
  agent: {
    suggestedDescription: string;
    suggestedSkillTags: string[];
    note: string;
  };
  service: {
    name: string;
    priceUsdc: number;
    description: string;
    slaHours: number;
    slaMinutes: number;
    deliverableType: 'text' | 'schema';
    requirementsType: 'text' | 'schema' | 'none';
  };
  currencyWarning?: string;
}

/**
 * CROO does not expose an API to create an Agent or Service (confirmed against the SDK and
 * docs - registration is a dashboard-only, human step). This builds the exact payload the
 * agent.croo.network "+ Add Service" wizard expects from our existing MongoDB Agent record, so
 * the owner can copy/paste it in rather than re-typing everything from scratch. It is
 * deliberately NOT an automated "publish" call, because no such call exists yet.
 */
export function buildRegistrationGuide(agent: IAgent): RegistrationGuide {
  const slaMinutesTotal = 30;
  const currencyWarning =
    agent.pricing.currency !== 'USDC'
      ? `This agent is priced in ${agent.pricing.currency}, but CROO services are priced in USDC on Base. Convert before entering a price.`
      : undefined;

  return {
    dashboardUrl: 'https://agent.croo.network',
    steps: [
      'Sign in at agent.croo.network with your wallet, Google, or email.',
      'Go to My Agents -> Register Agent, and enter a name/avatar (this mints a new CROO Agent DID + AA wallet and issues a croo_sk_... API key shown once).',
      'On the Configure page, paste the "suggestedDescription" and pick up to 5 skill tags from CROO\'s own tag library that best match "suggestedSkillTags" below.',
      'Click "+ Add Service" and fill in the wizard using the "service" fields below.',
      'Save your CROO Agent ID, Service ID, and API key, then paste them into CROO Hub via POST /api/v1/cap/agents/:slug/link.',
    ],
    agent: {
      suggestedDescription: agent.description,
      suggestedSkillTags: agent.capabilities.slice(0, 5),
      note: 'CROO requires 1-5 tags from its own standard tag library - these are suggestions to match against that list, not guaranteed to exist verbatim.',
    },
    service: {
      name: agent.name,
      priceUsdc: agent.pricing.currency === 'USDC' ? agent.pricing.amount : 0,
      description: agent.tagline || agent.description,
      slaHours: Math.floor(slaMinutesTotal / 60),
      slaMinutes: slaMinutesTotal % 60,
      deliverableType: 'text',
      requirementsType: agent.capabilities.length > 0 ? 'schema' : 'none',
    },
    currencyWarning,
  };
}

/** Agents owned by `userId`, with only the fields the CROO Integration panel needs. */
export async function listMyAgentsForCap(userId: string) {
  return Agent.find({ owner: userId }).select(
    'name slug category verification availability crooAgentId crooServiceId crooSyncStatus crooLastSyncedAt',
  );
}

export interface LinkCapAgentInput {
  crooAgentId: string;
  crooServiceId?: string;
}

/** Persists the cross-reference between a CROO-Hub agent and its CROO Network counterpart. */
export async function linkCapAgent(slug: string, input: LinkCapAgentInput) {
  const agent = await Agent.findOne({ slug });
  if (!agent) throw AppError.notFound('Agent not found');

  agent.crooAgentId = input.crooAgentId;
  agent.crooServiceId = input.crooServiceId;
  agent.crooSyncStatus = 'linked';
  agent.crooLastSyncedAt = new Date();
  await agent.save();

  return agent;
}

export async function unlinkCapAgent(slug: string) {
  const agent = await Agent.findOne({ slug });
  if (!agent) throw AppError.notFound('Agent not found');

  agent.crooAgentId = undefined;
  agent.crooServiceId = undefined;
  agent.crooSyncStatus = 'unlinked';
  agent.crooLastSyncedAt = new Date();
  await agent.save();

  return agent;
}
