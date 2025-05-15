"use client";

import Link from 'next/link';
import { Task } from '@/types/task';
import { shortenAddress, formatDate } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
}

export function getStatusClass(status: string) {
  switch (status) {
    case 'created':
      return 'bg-blue-900/20 text-blue-400 border-blue-900';
    case 'accepted':
      return 'bg-yellow-900/20 text-yellow-400 border-yellow-900';
    case 'completed':
      return 'bg-purple-900/20 text-purple-400 border-purple-900';
    case 'verified':
      return 'bg-green-900/20 text-green-400 border-green-900';
    default:
      return 'bg-neutral-900/20 text-neutral-400 border-neutral-900';
  }
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="border border-neutral-800 rounded-lg p-4 hover:bg-neutral-900/50 transition cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-white">Task #{task.id}</h3>
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusClass(task.status)}`}>
            {task.status}
          </span>
        </div>
        <p className="text-sm text-neutral-300 line-clamp-2 mb-2">{task.description}</p>
        <div className="flex justify-between text-xs text-neutral-500">
          <span>Creator: {shortenAddress(task.creator)}</span>
          <span>{formatDate(task.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
