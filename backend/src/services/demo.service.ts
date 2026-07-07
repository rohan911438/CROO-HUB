import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { seed } from '../seed/seed';

export const DEMO_CREDENTIALS = { email: 'demo@croohub.ai', password: 'Password123!' } as const;

/** Wipes and re-seeds every collection back to the canned demo dataset, so a judge/reviewer can
 *  get a known-good environment with one click instead of a terminal. Gated behind demoModeEnabled
 *  so it can't be hit against a real production dataset by accident. */
export async function resetDemoData() {
  if (!env.demoModeEnabled) {
    throw AppError.forbidden('Demo mode reset is disabled in this environment.');
  }
  await seed();
  return { ...DEMO_CREDENTIALS };
}
