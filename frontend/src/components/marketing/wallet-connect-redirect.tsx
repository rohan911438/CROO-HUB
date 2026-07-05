'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

/**
 * Mounted on the public marketing site only. Once a wallet successfully connects, send the
 * visitor straight into the dashboard rather than leaving them on the landing page.
 */
export function WalletConnectRedirect() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isConnected && address && !hasRedirected.current) {
      hasRedirected.current = true;
      toast.success('Wallet connected', { description: 'Taking you to your dashboard.' });
      router.push('/dashboard');
    }
  }, [isConnected, address, router]);

  return null;
}
