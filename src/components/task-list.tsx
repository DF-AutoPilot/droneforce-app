'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasks, Task } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCard } from '@/components/task/task-card';

export function TaskList() {
  const { publicKey } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const taskData = await getTasks();
        setTasks(taskData);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, []);
  
  const myCreatedTasks = tasks.filter(
    task => task.creator === publicKey?.toBase58()
  );
  
  const myOperatedTasks = tasks.filter(
    task => task.operator === publicKey?.toBase58()
  );
  
  const otherTasks = tasks.filter(
    task => task.creator !== publicKey?.toBase58() && task.operator !== publicKey?.toBase58()
  );
  
  // Status classes are now handled by the TaskCard component
  
  const renderTaskList = (taskList: Task[]) => {
    if (loading) {
      return (
        <div className="text-center py-8 text-neutral-400">
          Loading tasks...
        </div>
      );
    }
    
    if (taskList.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-400">
          No tasks found
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {taskList.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  };
  
  return (
    <Card className="w-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-white">Task List</CardTitle>
        <CardDescription className="text-neutral-400">
          Available drone tasks in the DroneForce Protocol
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="myCreated" className="w-full">
          <TabsList className="w-full bg-neutral-900 mb-4">
            <TabsTrigger value="myCreated" className="flex-1">My Created</TabsTrigger>
            <TabsTrigger value="myOperated" className="flex-1">My Operated</TabsTrigger>
            <TabsTrigger value="other" className="flex-1">All Other</TabsTrigger>
          </TabsList>
          <TabsContent value="myCreated">
            {renderTaskList(myCreatedTasks)}
          </TabsContent>
          <TabsContent value="myOperated">
            {renderTaskList(myOperatedTasks)}
          </TabsContent>
          <TabsContent value="other">
            {renderTaskList(otherTasks)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
