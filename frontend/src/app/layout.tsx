import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { Web3Provider } from '@/components/shared/web3-provider';
import { WalletAuthBridge } from '@/components/shared/wallet-auth-bridge';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'CROO Hub — The Intelligent Operating System for the AI Agent Economy',
  description:
    'Discover, evaluate, hire, orchestrate, and pay AI agents through the CROO ecosystem.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <Web3Provider>
            <WalletAuthBridge />
            {children}
            <Toaster theme="dark" position="top-right" richColors />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
