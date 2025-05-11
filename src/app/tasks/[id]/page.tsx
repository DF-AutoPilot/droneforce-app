"use client";

import { TaskDetail } from '@/components/task-detail';
import { useParams } from 'next/navigation';
import { PageLayout } from '@/components/layout/page-layout';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  
  return (
    <PageLayout 
      activePath={`/tasks/${taskId}`}
      showBackLink={true}
      backLink="/tasks"
      backLabel="← Back to Tasks"
    >
      <TaskDetail taskId={taskId} />
    </PageLayout>
  );
}
