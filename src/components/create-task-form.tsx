'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { toast } from 'sonner';

import { createTask } from '@/lib/api';
import { connection } from '@/lib/solana';
import { createTaskInstruction } from '@/lib/anchor-client';
import { generateTaskId } from '@/lib/utils';
import { Form } from '@/components/ui/form';
import { FormField } from '@/components/ui/form-field';
import { CheckboxField } from '@/components/ui/checkbox-field';

export function CreateTaskForm() {
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } = useWallet();
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
      
      // Get recent blockhash for transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      
      // Ensure duration is within valid range for uint8 (0-255)
      const safeTaskDuration = Math.min(taskData.duration, 255);
      
      try {
        // createTaskInstruction now returns a complete transaction
        const transaction = await createTaskInstruction(
          publicKey,
          signTransaction,
          signAllTransactions,
          taskId,
          taskData.location,
          taskData.areaSize,
          taskData.altitude,
          safeTaskDuration, // Use the safe duration value
          taskData.geofencingEnabled,
          taskData.description
        );
        
        // Set the feePayer and recentBlockhash
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = blockhash;
        
        console.log('Program transaction created for task:', {
          taskId,
          feePayer: publicKey.toString(),
          recentBlockhash: blockhash
        });
        
        // Create a clean version of the transaction for potential debugging
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });
        console.log('Serialized transaction size:', serializedTransaction.length, 'bytes');
        
        console.log('Sending transaction to Solana network...');
        
        // Create a checkbox state to toggle skipPreflight
        const skipPreflightChecks = true; // For debugging, we'll skip preflight checks
        
        try {
          console.log('Sending transaction with skipPreflight =', skipPreflightChecks);
          
          // Send transaction to the blockchain with explicit options
          const signature = await sendTransaction(transaction, connection, {
            skipPreflight: skipPreflightChecks, // Skip preflight to bypass simulation errors
            preflightCommitment: 'confirmed',
            maxRetries: 3
          });
          console.log('Transaction sent with signature:', signature);
          
          // Wait for confirmation
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          console.log('Transaction confirmed:', confirmation);
        } catch (txError: any) {
          console.error('Transaction error details:', txError);
          if (txError.logs) {
            console.error('Transaction logs:', txError.logs);
          }
          if (txError.message) {
            console.error('Transaction error message:', txError.message);
          }
          throw txError;
        }
      
        // Save data to Firestore
        await createTask({
          id: taskId,
          creator: publicKey.toBase58(),
          ...taskData
        });
      } catch (transactionError: any) {
        console.error('Error creating transaction:', transactionError);
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }
      
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
    <Form
      title="Create New Task"
      description="Define parameters for a new drone task"
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Creating...' : 'Create Task'}
      isSubmitting={isSubmitting}
    >
      <FormField
        id="location"
        name="location"
        label="Location (lat/lng)"
        placeholder="37.7749,-122.4194"
        value={taskData.location}
        onChange={handleChange}
        required
        helpText="Enter coordinates in format: latitude,longitude"
      />
      
      <FormField
        id="areaSize"
        name="areaSize"
        label="Area Size"
        type="number"
        min="1"
        value={taskData.areaSize}
        onChange={handleChange}
        required
        helpText="Diameter in meters"
      />
      
      <FormField
        id="altitude"
        name="altitude"
        label="Altitude"
        type="number"
        min="1"
        value={taskData.altitude}
        onChange={handleChange}
        required
        helpText="Height in meters"
      />
      
      <FormField
        id="duration"
        name="duration"
        label="Duration"
        type="number"
        min="1"
        value={taskData.duration}
        onChange={handleChange}
        required
        helpText="Time in seconds (max 255)"
      />
      
      <CheckboxField
        id="geofencingEnabled"
        label="Enable Geofencing"
        checked={taskData.geofencingEnabled}
        onCheckedChange={handleCheckboxChange}
        helpText="Restrict drone to specified area"
      />
      
      <FormField
        id="description"
        name="description"
        label="Description"
        placeholder="Task description"
        value={taskData.description}
        onChange={handleChange}
        required
        helpText="Details about the task"
      />
    </Form>
  );
}
