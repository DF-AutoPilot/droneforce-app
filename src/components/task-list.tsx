import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasks, Task } from '@/lib/api';
import { shortenAddress, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  
  const getStatusClass = (status: string) => {
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
  };
  
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
          <Link key={task.id} href={`/tasks/${task.id}`}>
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
