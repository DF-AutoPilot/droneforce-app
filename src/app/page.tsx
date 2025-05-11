"use client";

import { CreateTaskForm } from '@/components/create-task-form';
import { TaskList } from '@/components/task-list';
import { Header } from '@/components/layout/header';
import { useWalletConnectionGuard } from '@/components/wallet/wallet-controls';

export default function Home() {
  const { shouldShow, connectComponent } = useWalletConnectionGuard();
  
  if (shouldShow) {
    return connectComponent;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <Header activePath="/" />
        
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
