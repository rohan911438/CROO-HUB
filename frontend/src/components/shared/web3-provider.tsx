'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { wagmiConfig } from '@/lib/wagmi';

const queryClient = new QueryClient();

function RainbowKitThemeBridge({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <RainbowKitProvider
      initialChain={baseSepolia}
      theme={
        theme === 'light'
          ? lightTheme({ accentColor: 'hsl(255 75% 56%)', borderRadius: 'medium' })
          : darkTheme({ accentColor: 'hsl(255 85% 66%)', borderRadius: 'medium' })
      }
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitThemeBridge>{children}</RainbowKitThemeBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
