'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getTaskById, Task, acceptTask, completeTask } from '@/lib/api';
import { acceptTaskInstruction, completeTaskInstruction, connection } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskDetailProps {
  taskId: string;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const { publicKey, sendTransaction } = useWallet();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Task completion form fields
  const [arweaveTxId, setArweaveTxId] = useState('');
  const [logHash, setLogHash] = useState('');
  const [signature, setSignature] = useState('');
  const [logFile, setLogFile] = useState<File | null>(null);
  
  useEffect(() => {
    const loadTask = async () => {
      try {
        setLoading(true);
        const taskData = await getTaskById(taskId);
        setTask(taskData);
      } catch (error) {
        console.error('Error loading task:', error);
        toast.error('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };
    
    loadTask();
  }, [taskId]);
  
  const handleAcceptTask = async () => {
    if (!publicKey || !task) return;
    
    try {
      setIsSubmitting(true);
      
      try {
        // Since acceptTaskInstruction is async, we need to await it
        const instruction = await acceptTaskInstruction(publicKey, task.id);
        
        // Create the transaction
        const transaction = new Transaction().add(instruction);
        
        // Send transaction to the blockchain
        const txSignature = await sendTransaction(transaction, connection);
        
        // Wait for confirmation
        await connection.confirmTransaction(txSignature, 'confirmed');
        
        // Update in Firestore
        await acceptTask(task.id, publicKey.toBase58());
        
        // Update local state
        setTask({
          ...task,
          operator: publicKey.toBase58(),
          status: 'accepted',
          acceptedAt: Date.now()
        });
        
        toast.success('Task accepted successfully');
      } catch (instructionError: any) {
        console.error('Error with accept task instruction:', instructionError);
        throw new Error(`Failed to create accept task instruction: ${instructionError.message}`);
      }
    } catch (error: any) {
      console.error('Error accepting task:', error);
      toast.error(`Failed to accept task: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCompleteTask = async () => {
    if (!publicKey || !task) return;
    
    try {
      setIsSubmitting(true);
      
      try {
        // Since completeTaskInstruction is async, we need to await it
        const instruction = await completeTaskInstruction(
          publicKey,
          task.id,
          arweaveTxId,
          logHash,
          signature
        );
        
        // Create the transaction
        const transaction = new Transaction().add(instruction);
        
        // Send transaction to the blockchain
        const txSignature = await sendTransaction(transaction, connection);
        
        // Wait for confirmation
        await connection.confirmTransaction(txSignature, 'confirmed');
        
        // Update in Firestore and upload log file if provided
        await completeTask(
          task.id,
          arweaveTxId,
          logHash,
          signature,
          logFile || undefined
        );
        
        // Update local state
        setTask({
          ...task,
          arweaveTxId,
          logHash,
          signature,
          status: 'completed',
          completedAt: Date.now()
        });
        
        toast.success('Task completed successfully');
        
        // Reset form fields
        setArweaveTxId('');
        setLogHash('');
        setSignature('');
        setLogFile(null);
      } catch (instructionError: any) {
        console.error('Error with complete task instruction:', instructionError);
        throw new Error(`Failed to create complete task instruction: ${instructionError.message}`);
      }
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(`Failed to complete task: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogFile(e.target.files[0]);
    }
  };
  
  if (loading) {
    return (
      <Card className="w-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <CardContent className="py-10 text-center">
          <p className="text-neutral-400">Loading task details...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!task) {
    return (
      <Card className="w-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <CardContent className="py-10 text-center">
          <p className="text-neutral-400">Task not found</p>
        </CardContent>
      </Card>
    );
  }
  
  const isCreator = publicKey?.toBase58() === task.creator;
  const isOperator = publicKey?.toBase58() === task.operator;
  const canAccept = !isCreator && !task.operator && task.status === 'created';
  const canComplete = isOperator && task.status === 'accepted';
  
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
  
  return (
    <Card className="w-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl text-white">Task #{task.id}</CardTitle>
          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusClass(task.status)}`}>
            {task.status}
          </span>
        </div>
        <CardDescription className="text-neutral-400">
          Created on {formatDate(task.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Creator</h3>
            <p className="text-white">{task.creator}</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Operator</h3>
            <p className="text-white">{task.operator || 'Not assigned'}</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Location</h3>
            <p className="text-white">{task.location}</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Area Size</h3>
            <p className="text-white">{task.areaSize} meters</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Altitude</h3>
            <p className="text-white">{task.altitude} meters</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Duration</h3>
            <p className="text-white">{task.duration} seconds</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Geofencing</h3>
            <p className="text-white">{task.geofencingEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-400">Description</h3>
            <p className="text-white">{task.description}</p>
          </div>
        </div>
        
        {task.status === 'completed' || task.status === 'verified' ? (
          <div className="mt-6 space-y-4 border-t border-neutral-800 pt-4">
            <h3 className="text-md font-medium text-white">Completion Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Arweave Transaction ID</h3>
                <p className="text-white break-all">{task.arweaveTxId}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Log Hash</h3>
                <p className="text-white break-all">{task.logHash}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Signature</h3>
                <p className="text-white break-all">{task.signature}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Completed At</h3>
                <p className="text-white">{task.completedAt ? formatDate(task.completedAt) : 'N/A'}</p>
              </div>
            </div>
          </div>
        ) : null}
        
        {task.status === 'verified' ? (
          <div className="mt-6 space-y-4 border-t border-neutral-800 pt-4">
            <h3 className="text-md font-medium text-white">Verification Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Verification Result</h3>
                <p className="text-white">{task.verificationResult ? 'Verified' : 'Failed'}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Verification Report Hash</h3>
                <p className="text-white break-all">{task.verificationReportHash}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Verified At</h3>
                <p className="text-white">{task.verifiedAt ? formatDate(task.verifiedAt) : 'N/A'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-4">
        {canAccept && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleAcceptTask}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Accepting...' : 'Accept Task'}
          </Button>
        )}
        
        {canComplete && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">Complete Task</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-neutral-800 bg-neutral-950">
              <DialogHeader>
                <DialogTitle className="text-white">Complete Task</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Provide completion details for this task
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="arweaveTxId" className="text-sm font-medium text-neutral-400">
                    Arweave Transaction ID
                  </label>
                  <Input
                    id="arweaveTxId"
                    value={arweaveTxId}
                    onChange={(e) => setArweaveTxId(e.target.value)}
                    className="border-neutral-800 bg-neutral-900"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="logHash" className="text-sm font-medium text-neutral-400">
                    Log Hash
                  </label>
                  <Input
                    id="logHash"
                    value={logHash}
                    onChange={(e) => setLogHash(e.target.value)}
                    className="border-neutral-800 bg-neutral-900"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signature" className="text-sm font-medium text-neutral-400">
                    Signature
                  </label>
                  <Input
                    id="signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="border-neutral-800 bg-neutral-900"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="logFile" className="text-sm font-medium text-neutral-400">
                    Log File (.bin)
                  </label>
                  <Input
                    id="logFile"
                    type="file"
                    accept=".bin"
                    onChange={handleFileChange}
                    className="border-neutral-800 bg-neutral-900"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleCompleteTask}
                  disabled={isSubmitting || !arweaveTxId || !logHash || !signature}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Completion'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}
