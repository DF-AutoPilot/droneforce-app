'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export function WalletConnect() {
  const { connected, disconnect } = useWallet();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900">
      <Card className="w-full max-w-md border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 relative w-20 h-20">
            <Image 
              src="/dfautopilot-logo-1.png" 
              alt="DroneForce Protocol" 
              width={80} 
              height={80}
              className="rounded-xl filter invert"
            />
          </div>
          <CardTitle className="text-xl text-white">{connected ? 'Your wallet is connected' : 'Connect your Solana wallet to continue'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pb-2">
          <p className="text-sm text-neutral-400 mb-4 text-center">
            Use Phantom wallet to interact with the DF-Autopilot platform on Solana. All transactions occur on the devnet.
          </p>
          
          <div className="flex justify-center w-full space-x-4">
            <WalletMultiButton className="phantom-button" />
            
            {connected && (
              <Button 
                variant="destructive" 
                onClick={() => disconnect()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Disconnect Wallet
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-xs text-neutral-500 pt-2">
          <p>By connecting, you acknowledge that you are interacting with a frontend-only application.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
