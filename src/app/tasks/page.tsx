"use client";

import { TaskList } from '@/components/task-list';
import { PageLayout } from '@/components/layout/page-layout';

export default function TasksPage() {
  return (
    <PageLayout activePath="/tasks">
      <div>
        <TaskList />
      </div>
    </PageLayout>
  );
}
