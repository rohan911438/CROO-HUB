import { AgentClient } from '@croo-network/sdk';
import { env } from '../../config/env';

/**
 * CAP is the CROO Agent Protocol: CROO Network's Base-mainnet agent commerce layer
 * (see ../../../../CROO_CAP_COMPATIBILITY_REPORT.md). CROO Hub integrates with it as a
 * third party via @croo-network/sdk - we never re-implement CAPCore/CAPVault ourselves.
 *
 * The SDK exposes exactly one client, authenticated with a single croo_sk_... key tied to
 * one CROO Agent. There is no multi-tenant key management in the SDK itself, so - for this
 * integration's current scope - CROO Hub holds one platform-level CROO identity (configured
 * via CROO_SDK_KEY) rather than a distinct CROO Agent per CROO-Hub agent. See the
 * "registration guide" flow in cap.service.ts for how individual CROO-Hub agents still get
 * their own CROO Agent Store presence (created by their owner through CROO's dashboard).
 */
let cachedClient: AgentClient | null = null;

export function isCapConfigured(): boolean {
  return env.croo.isConfigured;
}

/** Lazily constructs (and caches) the CAP SDK client. Throws if CROO_SDK_KEY is unset. */
export function getCapClient(): AgentClient {
  if (!env.croo.isConfigured) {
    throw new Error('CROO_SDK_KEY is not configured - CAP integration is disabled');
  }
  if (!cachedClient) {
    cachedClient = new AgentClient(
      {
        baseURL: env.croo.apiUrl,
        wsURL: env.croo.wsUrl,
        rpcURL: env.croo.rpcUrl,
      },
      env.croo.sdkKey,
    );
  }
  return cachedClient;
}

/** Test-only escape hatch to force the client to be rebuilt after config changes. */
export function resetCapClient(): void {
  cachedClient = null;
}
