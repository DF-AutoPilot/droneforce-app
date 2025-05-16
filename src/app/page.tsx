"use client";

import { CreateTaskForm } from '@/components/create-task-form';
import { PageLayout } from '@/components/layout/page-layout';

export default function Home() {
  return (
    <PageLayout activePath="/">
      <div className="w-full">
        <CreateTaskForm />
      </div>
    </PageLayout>
  );
}
