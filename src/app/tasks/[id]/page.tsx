"use client";

import { TaskDetail } from '@/components/task-detail';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { useWalletConnectionGuard } from '@/components/wallet/wallet-controls';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { shouldShow, connectComponent } = useWalletConnectionGuard();
  
  if (shouldShow) {
    return connectComponent;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <Header activePath={`/tasks/${taskId}`} />
        
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
