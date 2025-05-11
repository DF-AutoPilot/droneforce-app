"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from '@/components/wallet-connect';
import { TaskDetail } from '@/components/task-detail';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TaskDetailPage() {
  const { connected } = useWallet();
  const params = useParams();
  const taskId = params.id as string;
  
  if (!connected) {
    return <WalletConnect />;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/">
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
            </Link>
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
              All Tasks
            </Link>
          </nav>
        </header>
        
        <div className="mb-6">
          <Link 
            href="/tasks" 
            className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Tasks
          </Link>
        </div>
        
        <TaskDetail taskId={taskId} />
      </div>
    </main>
  );
}
