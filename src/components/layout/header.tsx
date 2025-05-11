"use client";

import { Logo } from '@/components/ui/logo';
import { Navigation } from '@/components/layout/navigation';
import { WalletControls } from '@/components/wallet/wallet-controls';

interface HeaderProps {
  activePath?: string;
}

export function Header({ activePath = '' }: HeaderProps) {
  return (
    <header className="mb-8 flex justify-between items-center">
      <Logo size="sm" linkToHome={true} />
      
      <div className="flex items-center">
        <Navigation activePath={activePath} />
        <WalletControls />
      </div>
    </header>
  );
}
