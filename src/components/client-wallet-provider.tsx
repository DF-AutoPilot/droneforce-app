'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import dynamic from 'next/dynamic';

// Dynamically import the WalletContextProvider to avoid SSR
const WalletContextProvider = dynamic(
  () => import('@/components/providers/wallet-provider-wrapper').then(mod => mod.WalletContextProvider),
  { ssr: false }
);

export function ClientWalletProvider({ children }: { children: ReactNode }) {
  // Add client-side only rendering to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show nothing until client-side code is running
  if (!isMounted) {
    return null;
  }

  return (
    <WalletContextProvider>
      {children}
      <Toaster />
    </WalletContextProvider>
  );
}
