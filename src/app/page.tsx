"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from '@/components/wallet-connect';
import { CreateTaskForm } from '@/components/create-task-form';
import { TaskList } from '@/components/task-list';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const { connected } = useWallet();
  
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
                src="/droneforce-logo.png" 
                alt="DroneForce Protocol" 
                width={40} 
                height={40}
                className="rounded-lg"
              />
            </div>
            <h1 className="text-xl font-bold text-white">DroneForce Protocol</h1>
          </div>
          
          <nav className="flex gap-4">
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
