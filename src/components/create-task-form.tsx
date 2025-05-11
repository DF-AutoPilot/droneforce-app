'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createTask } from '@/lib/api';
import { createTaskInstruction } from '@/lib/solana';
import { generateTaskId } from '@/lib/utils';
import { connection } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';
import { toast } from 'sonner';

export function CreateTaskForm() {
  const { publicKey, sendTransaction } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [taskData, setTaskData] = useState({
    location: '',
    areaSize: 100,
    altitude: 50,
    duration: 300,
    geofencingEnabled: true,
    description: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setTaskData({
        ...taskData,
        [name]: parseInt(value, 10)
      });
    } else {
      setTaskData({
        ...taskData,
        [name]: value
      });
    }
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setTaskData({
      ...taskData,
      geofencingEnabled: checked
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast.error('Wallet not connected');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Generate a unique task ID
      const taskId = generateTaskId();
      
      // Create the transaction
      const instruction = createTaskInstruction(
        publicKey,
        taskId,
        taskData.location,
        taskData.areaSize,
        taskData.altitude,
        taskData.duration,
        taskData.geofencingEnabled,
        taskData.description
      );
      
      const transaction = new Transaction().add(instruction);
      
      // Send transaction to the blockchain
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Save data to Firestore
      await createTask({
        id: taskId,
        creator: publicKey.toBase58(),
        ...taskData
      });
      
      toast.success('Task created successfully');
      
      // Reset the form
      setTaskData({
        location: '',
        areaSize: 100,
        altitude: 50,
        duration: 300,
        geofencingEnabled: true,
        description: '',
      });
      
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-white">Create New Task</CardTitle>
        <CardDescription className="text-neutral-400">
          Define parameters for a new drone task
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium text-neutral-400">
              Location (lat/lng)
            </label>
            <Input
              id="location"
              name="location"
              placeholder="37.7749,-122.4194"
              value={taskData.location}
              onChange={handleChange}
              required
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="areaSize" className="text-sm font-medium text-neutral-400">
              Area Size (meters)
            </label>
            <Input
              id="areaSize"
              name="areaSize"
              type="number"
              min="1"
              value={taskData.areaSize}
              onChange={handleChange}
              required
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="altitude" className="text-sm font-medium text-neutral-400">
              Altitude (meters)
            </label>
            <Input
              id="altitude"
              name="altitude"
              type="number"
              min="1"
              value={taskData.altitude}
              onChange={handleChange}
              required
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium text-neutral-400">
              Duration (seconds)
            </label>
            <Input
              id="duration"
              name="duration"
              type="number"
              min="1"
              value={taskData.duration}
              onChange={handleChange}
              required
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="geofencingEnabled" 
              checked={taskData.geofencingEnabled}
              onCheckedChange={handleCheckboxChange}
            />
            <label
              htmlFor="geofencingEnabled"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-400"
            >
              Enable Geofencing
            </label>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-neutral-400">
              Description
            </label>
            <Input
              id="description"
              name="description"
              placeholder="Task description"
              value={taskData.description}
              onChange={handleChange}
              required
              className="border-neutral-800 bg-neutral-900"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-neutral-800 hover:bg-neutral-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
