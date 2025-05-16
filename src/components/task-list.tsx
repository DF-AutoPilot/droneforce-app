'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTasks } from '@/lib/api';
import { Task } from '@/types/task';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCard } from '@/components/task/task-card';
import { TaskFilters, FilterCriteria } from '@/components/ui/task-filters';
import { calculateDistance } from '@/lib/geo-utils';

export function TaskList() {
  const { publicKey } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterCriteria>({
    status: 'all',
    radius: 0,
    minPrice: 0,
    maxPrice: 100,
    useCurrentLocation: false
  });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
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
  
  // Update user location when using current location filter
  useEffect(() => {
    if (filters.useCurrentLocation && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            setUserLocation([position.coords.latitude, position.coords.longitude]);
          },
          error => {
            console.error('Error getting location:', error);
          }
        );
      }
    }
  }, [filters.useCurrentLocation, userLocation]);
  
  // Apply filters to tasks
  const applyFilters = (taskList: Task[]) => {
    return taskList.filter(task => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      
      // Price filter
      const taskPrice = task.paymentAmount || 0;
      if (taskPrice < filters.minPrice || taskPrice > filters.maxPrice) {
        return false;
      }
      
      // Location radius filter
      if (filters.useCurrentLocation && userLocation && filters.radius > 0) {
        try {
          const [taskLat, taskLng] = task.location.split(',').map(parseFloat);
          const distance = calculateDistance(
            userLocation[0], userLocation[1],
            taskLat, taskLng
          );
          
          if (distance > filters.radius) {
            return false;
          }
        } catch (error) {
          // If location parsing fails, include the task anyway
          console.error('Error parsing location:', error);
        }
      }
      
      return true;
    });
  };
  
  const handleFilterChange = (newFilters: FilterCriteria) => {
    setFilters(newFilters);
  };
  
  const myCreatedTasks = applyFilters(tasks.filter(
    task => task.creator === publicKey?.toBase58()
  ));
  
  const myOperatedTasks = applyFilters(tasks.filter(
    task => task.operator === publicKey?.toBase58()
  ));
  
  const otherTasks = applyFilters(tasks.filter(
    task => task.creator !== publicKey?.toBase58() && task.operator !== publicKey?.toBase58()
  ));
  
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
          
          {/* Task Filters */}
          <TaskFilters onFilterChange={handleFilterChange} />
          
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
