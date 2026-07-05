'use client';

import { useEffect } from 'react';

/**
 * Browser wallet extensions (MetaMask, Coinbase Wallet, OKX, Backpack, etc.) inject content
 * scripts into every page and occasionally throw uncaught errors of their own — e.g. "The
 * source ... has not been authorized yet" while their background/content-script handshake is
 * still settling. Next.js's dev overlay surfaces these as if they were app errors, even though
 * the stack trace points at `chrome-extension://...`. This swallows only that class of noise so
 * it doesn't get misattributed to CROO Hub's own code. It never suppresses errors that originate
 * from our own bundle.
 */
function isExtensionNoise(source?: string, stack?: unknown) {
  const stackStr = typeof stack === 'string' ? stack : '';
  return (source ?? '').startsWith('chrome-extension://') || stackStr.includes('chrome-extension://');
}

export function ExtensionErrorGuard() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (isExtensionNoise(event.filename, event.error?.stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as { stack?: unknown } | undefined;
      if (isExtensionNoise(undefined, reason?.stack)) {
        event.preventDefault();
      }
    }

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
    };
  }, []);

  return null;
}
