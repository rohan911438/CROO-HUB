import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'CROO Hub',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [baseSepolia],
  ssr: true,
});
