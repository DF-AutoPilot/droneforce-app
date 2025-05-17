/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import dynamic from 'next/dynamic';

import { createTask } from '@/lib/api';
import { connection } from '@/lib/solana';
import { createTaskInstruction } from '@/lib/anchor-client';
import { initializeEscrowInstruction } from '@/lib/escrow-client';
import { generateTaskId } from '@/lib/utils';
import { Form } from '@/components/ui/form';
import { FormField } from '@/components/ui/form-field';
import { CheckboxField } from '@/components/ui/checkbox-field';

// Dynamic import for the MapSelector (client-side only)
const MapSelector = dynamic(
  () => import('@/components/ui/map-selector').then(mod => mod.MapSelector),
  { ssr: false } // Disable server-side rendering
);

// Default SPL tokens available for payment (in a real app, you might fetch these)
const AVAILABLE_TOKENS = [
  {
    name: 'USDC',
    symbol: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Devnet USDC mint
    decimals: 6
  },
  {
    name: 'SOL',
    symbol: 'SOL',
    mint: 'So11111111111111111111111111111111111111112', // Native SOL wrapped
    decimals: 9
  }
];

export function CreateTaskForm() {
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTokenAccount, setHasTokenAccount] = useState(false);
  
  const [taskData, setTaskData] = useState({
    location: '',
    areaSize: 100,
    altitude: 50,
    duration: 300,
    geofencingEnabled: true,
    description: '',
    // Escrow payment data
    paymentAmount: 0.1, // Smaller default amount for testing
    selectedToken: AVAILABLE_TOKENS[0].mint,
  });
  
  // Check if user has token account for the selected token
  useEffect(() => {
    const checkTokenAccount = async () => {
      if (!publicKey || !taskData.selectedToken) return;
      
      try {
        const tokenMint = new PublicKey(taskData.selectedToken);
        const tokenAccount = getAssociatedTokenAddressSync(tokenMint, publicKey);
        
        // In a full implementation, you would check if this account exists
        // For simplicity, we'll just assume it exists
        setHasTokenAccount(true);
      } catch (error) {
        console.error('Error checking token account:', error);
        setHasTokenAccount(false);
      }
    };
    
    checkTokenAccount();
  }, [publicKey, taskData.selectedToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'number') {
      setTaskData({
        ...taskData,
        [name]: parseFloat(value)
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
    
    if (!hasTokenAccount) {
      toast.error(`You need a token account for the selected payment token`);
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
        // Step 1: Create task transaction
        const taskTransaction = await createTaskInstruction(
          publicKey,
          signTransaction,
          signAllTransactions,
          taskId,
          taskData.location,
          taskData.areaSize,
          taskData.altitude,
          safeTaskDuration,
          taskData.geofencingEnabled,
          taskData.description
        );
        
        // Set the feePayer and recentBlockhash
        taskTransaction.feePayer = publicKey;
        taskTransaction.recentBlockhash = blockhash;
        
        console.log('Program transaction created for task:', {
          taskId,
          feePayer: publicKey.toString(),
          recentBlockhash: blockhash
        });
        
        // Step 2: Initialize escrow for payment
        const paymentMint = new PublicKey(taskData.selectedToken);
        const selectedToken = AVAILABLE_TOKENS.find(token => token.mint === taskData.selectedToken);
        
        // Convert payment amount to token units based on decimals
        const tokenDecimals = selectedToken?.decimals || 6;
        const paymentAmount = taskData.paymentAmount * Math.pow(10, tokenDecimals);
        
        // Create escrow initialization transaction
        const { transaction: escrowTransaction } = await initializeEscrowInstruction(
          publicKey,
          signTransaction,
          signAllTransactions,
          paymentMint,
          paymentAmount,
          'drone_service', // Service type
          taskId // Use taskId as nonce for linking
        );
        
        // Set the feePayer and recentBlockhash for escrow transaction
        escrowTransaction.feePayer = publicKey;
        escrowTransaction.recentBlockhash = blockhash;
        
        console.log('Escrow transaction created:', {
          taskId,
          paymentAmount,
          paymentMint: paymentMint.toString()
        });
        
        // Step 3: Send first transaction (task creation)
        console.log('Sending task creation transaction...');
        const taskSignature = await sendTransaction(taskTransaction, connection, {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
        
        // Wait for task transaction confirmation
        await connection.confirmTransaction(taskSignature, 'confirmed');
        console.log('Task creation transaction confirmed:', taskSignature);
        
        // Step 4: Send second transaction (escrow initialization)
        console.log('Sending escrow initialization transaction...');
        const escrowSignature = await sendTransaction(escrowTransaction, connection, {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
        
        // Wait for escrow transaction confirmation
        await connection.confirmTransaction(escrowSignature, 'confirmed');
        console.log('Escrow initialization transaction confirmed:', escrowSignature);
        
        // Step 5: Save data to Firestore with escrow information
        await createTask({
          id: taskId,
          creator: publicKey.toBase58(),
          ...taskData,
          paymentEscrow: {
            initialized: true,
            tokenMint: paymentMint.toString(),
            amount: taskData.paymentAmount,
            escrowTxSignature: escrowSignature
          }
        });
        
        toast.success('Task and payment escrow created successfully');
        
        // Reset the form
        setTaskData({
          location: '',
          areaSize: 100,
          altitude: 50,
          duration: 300,
          geofencingEnabled: true,
          description: '',
          paymentAmount: 10,
          selectedToken: AVAILABLE_TOKENS[0].mint,
        });
        
      } catch (transactionError: any) {
        console.error('Transaction error:', transactionError);
        
        if (transactionError.logs) {
          console.error('Transaction logs:', transactionError.logs);
        }
        
        throw new Error(`Failed to complete transaction: ${transactionError.message}`);
      }
      
    } catch (error) {
      console.error('Error creating task with escrow:', error);
      toast.error('Failed to create task and payment escrow');
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
      className="max-w-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Map */}
        <div className="lg:col-span-7">
          <MapSelector
            value={taskData.location}
            onChange={(location) => setTaskData(prev => ({ ...prev, location }))}
            radius={taskData.areaSize}
            className="h-[500px] w-full rounded-lg"
          />
        </div>

        {/* Right column - Form fields */}
        <div className="lg:col-span-5 space-y-4">
          <FormField
            id="location"
            name="location"
            label="Location (lat/lng)"
            placeholder="37.7749,-122.4194"
            value={taskData.location}
            onChange={handleChange}
            required
            helpText="Enter coordinates or click on the map"
          />
          
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="duration"
              name="duration"
              label="Duration"
              type="number"
              min="1"
              value={taskData.duration}
              onChange={handleChange}
              required
              helpText="(minutes)"
            />
            
            <div className="pt-6">
              <CheckboxField
                id="geofencingEnabled"
                label="Enable Geofencing"
                checked={taskData.geofencingEnabled}
                onCheckedChange={handleCheckboxChange}
                helpText="Restrict drone to specified area"
              />
            </div>
          </div>
          
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
          {/* Added a div with the border styling we want */}
          <div className="border-b-0"></div>
          
          {/* Payment section */}
          <div className="mt-2 mb-3 pt-2">
            <h3 className="text-lg font-medium mb-1 text-white">Payment Details</h3>
            <p className="text-sm text-neutral-400 mb-2">
              Funds will be held in escrow until task completion
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormField
                id="paymentAmount"
                name="paymentAmount"
                label="Payment Amount"
                type="number"
                min="0.001"
                step="0.001"
                value={taskData.paymentAmount}
                onChange={handleChange}
                required
                helpText="Amount to pay for the service"
              />
            </div>
            
            <div>
              <label htmlFor="selectedToken" className="block text-sm font-medium mb-1">
                Token
              </label>
              <p className="text-sm text-neutral-500 mb-1">
                Select token for payment
              </p>
              <select
                id="selectedToken"
                name="selectedToken"
                value={taskData.selectedToken}
                onChange={handleChange}
                className="w-full rounded-md border bg-neutral-900 border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {AVAILABLE_TOKENS.map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {!hasTokenAccount && publicKey && (
            <div className="p-2 bg-yellow-900 text-yellow-200 rounded-md text-sm">
              Warning: You may need to create a token account for the selected token
            </div>
          )}
        </div>
      </div>
    </Form>
  );
}
