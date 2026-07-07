'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { getAccessToken, storeTokens } from '@/lib/auth';

/**
 * Mounted app-wide. Connecting a wallet *is* signing in: on connect, request a one-time message,
 * sign it, verify the signature with the backend (auto-provisioning a User on first connect), and
 * land in the dashboard - no separate email/password sign-in step.
 */
export function WalletAuthBridge() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      attemptedFor.current = null;
      return;
    }
    if (getAccessToken()) return;
    if (attemptedFor.current === address) return;
    attemptedFor.current = address;

    (async () => {
      try {
        const { message } = await api.auth.walletNonce(address);
        const signature = await signMessageAsync({ message });
        const { accessToken, refreshToken } = await api.auth.walletVerify(address, signature);
        storeTokens(accessToken, refreshToken);
        toast.success('Wallet connected', { description: 'Taking you to your dashboard.' });
        router.push('/dashboard');
      } catch (err) {
        attemptedFor.current = null;
        const description = err instanceof ApiError ? err.message : 'Signature request was cancelled or failed.';
        toast.error('Wallet sign-in failed', { description });
        disconnect();
      }
    })();
  }, [isConnected, address, signMessageAsync, disconnect, router]);

  return null;
}
