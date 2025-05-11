"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from '@/components/wallet-connect';
import { CreateTaskForm } from '@/components/create-task-form';
import { TaskList } from '@/components/task-list';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const { connected, disconnect } = useWallet();
  
  if (!connected) {
    return <WalletConnect />;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image 
                src="/dfautopilot-logo-1.png" 
                alt="DroneForce Protocol" 
                width={40} 
                height={40}
                className="rounded-lg filter invert"
              />
            </div>
          </div>
          
          <nav className="flex gap-4 items-center">
            <Link 
              href="/"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/tasks"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Tasks
            </Link>
            <button
              onClick={() => disconnect()}
              className="ml-4 px-4 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors border border-neutral-700"
            >
              Disconnect Wallet
            </button>
          </nav>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <CreateTaskForm />
          </div>
          
          <div>
            <TaskList />
          </div>
        </div>
      </div>
    </main>
  );
}
