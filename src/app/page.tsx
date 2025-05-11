"use client";

import { CreateTaskForm } from '@/components/create-task-form';
import { TaskList } from '@/components/task-list';
import { PageLayout } from '@/components/layout/page-layout';

export default function Home() {
  return (
    <PageLayout activePath="/">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <CreateTaskForm />
        </div>
        
        <div>
          <TaskList />
        </div>
      </div>
    </PageLayout>
  );
}
