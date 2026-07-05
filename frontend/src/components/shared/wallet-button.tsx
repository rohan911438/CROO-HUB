'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function WalletButton({ compact }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <Button variant="outline" size={compact ? 'sm' : 'default'} disabled className="opacity-0">
              <Wallet className="h-4 w-4" />
            </Button>
          );
        }

        if (!connected) {
          return (
            <Button variant="outline" size={compact ? 'sm' : 'default'} onClick={openConnectModal}>
              <Wallet className="h-4 w-4" /> Connect wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button variant="destructive" size={compact ? 'sm' : 'default'} onClick={openChainModal}>
              <AlertTriangle className="h-4 w-4" /> Wrong network
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={openChainModal}
              className="hidden sm:inline-flex"
              aria-label="Switch network"
            >
              <Badge variant="secondary" className="cursor-pointer gap-1.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {chain.name}
              </Badge>
            </button>
            <Button variant="outline" size={compact ? 'sm' : 'default'} onClick={openAccountModal}>
              <Wallet className="h-4 w-4" />
              {account.displayName}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
