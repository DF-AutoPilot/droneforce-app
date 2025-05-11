"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { useWalletConnectionGuard } from '@/components/wallet/wallet-controls';

interface PageLayoutProps {
  children: ReactNode;
  activePath: string;
  showBackLink?: boolean;
  backLink?: string;
  backLabel?: string;
}

export function PageLayout({ 
  children, 
  activePath,
  showBackLink = false,
  backLink = '/tasks',
  backLabel = '← Back to Tasks'
}: PageLayoutProps) {
  const { shouldShow, connectComponent } = useWalletConnectionGuard();
  
  if (shouldShow) {
    return connectComponent;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <Header activePath={activePath} />
        
        {showBackLink && (
          <div className="mb-6">
            <Link 
              href={backLink} 
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
            >
              {backLabel}
            </Link>
          </div>
        )}
        
        {children}
      </div>
    </main>
  );
}
