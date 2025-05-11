"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from '@/components/wallet-connect';

interface WalletControlsProps {
  showConnectUI?: boolean;
  buttonClassName?: string;
}

export function WalletControls({ 
  showConnectUI = false, 
  buttonClassName = "ml-4 px-4 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors border border-neutral-700"
}: WalletControlsProps) {
  const { connected, disconnect } = useWallet();
  
  if (!connected && showConnectUI) {
    return <WalletConnect />;
  }
  
  if (!connected) {
    return null;
  }
  
  return (
    <button
      onClick={() => disconnect()}
      className={buttonClassName}
    >
      Disconnect Wallet
    </button>
  );
}

// Utility hook for wallet connection guard
export function useWalletConnectionGuard() {
  const { connected } = useWallet();
  
  return {
    isConnected: connected,
    shouldShow: !connected,
    connectComponent: <WalletConnect />
  };
}
