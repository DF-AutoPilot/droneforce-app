"use client";

import { TaskList } from '@/components/task-list';
import { Header } from '@/components/layout/header';
import { useWalletConnectionGuard } from '@/components/wallet/wallet-controls';

export default function TasksPage() {
  const { shouldShow, connectComponent } = useWalletConnectionGuard();
  
  if (shouldShow) {
    return connectComponent;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <Header activePath="/tasks" />
        
        <div>
          <TaskList />
        </div>
      </div>
    </main>
  );
}
