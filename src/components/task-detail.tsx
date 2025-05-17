/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { getTaskById, acceptTask, completeTask } from '@/lib/api';
import { Task } from '@/types/task';
// Import the blockchain service instead of direct functions
import { blockchainService } from '@/services';
// Remove Transaction import as it's handled by the service
import { formatDate } from '@/lib/utils';

// Dynamically import the LocationMap component (client-only)
const LocationMap = dynamic(
  () => import('@/components/ui/location-map').then(mod => mod.LocationMap),
  { ssr: false }
);
import { toast } from 'sonner';
import { FormField } from '@/components/ui/form-field';
import { VerifyTaskForm } from '@/components/task/verify-task-form';
import { ClaimPaymentButton } from '@/components/task/claim-payment-button';
import theme from '@/styles/theme';

interface TaskDetailProps {
  taskId: string;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Task completion form fields
  const [logFile, setLogFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  
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
        // Use the blockchain service to handle the entire transaction process
        const txSignature = await blockchainService.acceptTask(
          wallet, // Pass the entire wallet adapter
          task.id
        );
        
        console.log('Transaction signature:', txSignature);
        
        // Update the task in Firestore
        await acceptTask(task.id, publicKey.toBase58());
        
        // Update the local task state
        setTask({
          ...task,
          status: 'accepted',
          operator: publicKey.toBase58(),
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
    if (!task || !logFile) {
      toast.error('Please select a log file');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setIsFileUploading(true);
      
      // Generate a simple hash from the file content
      const fileHash = await generateFileHash(logFile);
      
      // Generate placeholder values for blockchain integration
      // In a real implementation, these would be derived from the file or blockchain transaction
      const arweaveTxId = `ar:mock:${Date.now().toString(36)}`;
      const logHash = fileHash;
      const signature = `sig:${Date.now().toString(36)}:${publicKey?.toString().slice(0, 8) || 'anon'}`;
      
      try {
        // Skip blockchain transaction for now, just log what would happen
        console.log('Would create blockchain transaction with:', {
          taskId: task.id,
          arweaveTxId,
          logHash,
          signature
        });
        
        // Rename the file with the correct format before upload
        const renamedFile = renameFile(logFile, `task-${task.id}-${logFile.name}`);
        
        // Log what we're about to do
        console.log('Uploading file:', renamedFile.name, 'size:', renamedFile.size);
        
        // Update in Firestore and upload log file - this handles the Firebase storage upload
        await completeTask(
          task.id,
          arweaveTxId,
          logHash,
          signature,
          renamedFile
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
        setLogFile(null);
      } catch (uploadError: any) {
        console.error('Error uploading file:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(`Failed to complete task: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setIsFileUploading(false);
    }
  };
  
  // Helper function to generate a simple hash from file content
  const generateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // For binary files, we'll use file metadata instead of content
      // This is a safer approach for demo purposes
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        timestamp: Date.now()
      };
      
      // Create a string from file metadata
      const metadataStr = JSON.stringify(fileInfo);
      
      // Create a simple hash from the metadata string
      // In production, you would use a proper crypto hash function
      let hash = '';
      for (let i = 0; i < metadataStr.length; i++) {
        hash += metadataStr.charCodeAt(i).toString(16);
      }
      
      // Trim to reasonable length and prefix with 0x
      resolve(`0x${hash.substring(0, 40)}`);
    });
  };
  
  // Helper function to rename a file while keeping the same content
  const renameFile = (file: File, newName: string): File => {
    return new File([file], newName, { type: file.type });
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
  const isValidator = publicKey?.toString() === process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY;
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

          {/* Location Map Section */}
          <div className="md:col-span-2 space-y-3 mt-2 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-neutral-400">Location</h3>
              <p className="text-white text-sm">{task.location}</p>
            </div>
            <LocationMap 
              coords={task.location} 
              radius={task.areaSize} 
              className="rounded-lg h-72" 
            />
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
            <p className="text-white">{task.duration} minutes</p>
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
              
              {task.paymentEscrow?.acceptedTxSignature && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-neutral-400">Payment Released</h3>
                  <p className="text-white break-all">
                    <span className="text-green-400">✓</span> Payment released to operator
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
        
        {/* Add escrow payment details if available */}
        {task.paymentEscrow && task.status !== 'verified' && (
          <div className="mt-6 space-y-4 border-t border-neutral-800 pt-4">
            <h3 className="text-md font-medium text-white">Payment Escrow</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Payment Amount</h3>
                <p className="text-white">{task.paymentAmount} tokens</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Token</h3>
                <p className="text-white break-all">{task.selectedToken || task.paymentEscrow.tokenMint}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-400">Status</h3>
                <p className="text-white">
                  {task.paymentEscrow.acceptedTxSignature ? (
                    <span className="text-green-400">Released</span>
                  ) : task.paymentEscrow.cancelledTxSignature ? (
                    <span className="text-red-400">Cancelled</span>
                  ) : (
                    <span className="text-yellow-400">In Escrow</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Task verification form for validators */}
        {task.status === 'completed' && !task.verificationResult && (
          <div className="mt-6 space-y-4 border-t border-neutral-800 pt-4">
            <VerifyTaskForm 
              task={task} 
              onVerificationComplete={() => {
                // Reload the task data after verification
                getTaskById(task.id).then(updatedTask => {
                  if (updatedTask) {
                    setTask(updatedTask);
                  }
                });
              }} 
            />
          </div>
        )}
        
        {/* Payment claim button for operators */}
        <ClaimPaymentButton 
          task={task}
          onPaymentClaimed={() => {
            // Reload the task data after payment is claimed
            getTaskById(task.id).then(updatedTask => {
              if (updatedTask) {
                setTask(updatedTask);
              }
            });
          }}
        />
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
            <DialogContent className="sm:max-w-md border-neutral-800 bg-neutral-950/90 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="text-white">Complete Task</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Provide completion details for this task
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="mb-6 p-4 bg-blue-950/30 border border-blue-800 rounded-md">
                  <h3 className="text-sm font-medium text-white mb-2">Task Completion</h3>
                  <p className="text-sm text-blue-300 mb-4">
                    Upload your flight log file to complete this task. The file will be automatically renamed to match the task ID.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="logFile" className="text-sm font-medium text-white">
                      Flight Log File
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <span className="text-xs text-neutral-400">Upload your drone flight log</span>
                  </div>
                  <div className="border border-dashed border-neutral-700 rounded-md p-6 text-center hover:border-blue-500 transition-colors">
                    {logFile ? (
                      <div className="space-y-2">
                        <p className="text-white font-medium">File Selected:</p>
                        <p className="text-white break-all">{logFile.name}</p>
                        <p className="text-neutral-400 text-sm">{(logFile.size / 1024).toFixed(2)} KB</p>
                        <p className="text-neutral-400 text-xs mt-2">
                          Will be uploaded as: <span className="text-blue-400">task-{task.id}-{logFile.name}</span>
                        </p>
                        <Button
                          className="mt-2 border-blue-500 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
                          variant="outline"
                          size="sm"
                          onClick={() => setLogFile(null)}
                        >
                          Change File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-neutral-300">Drag and drop your log file here or</p>
                          <div className="relative">
                            <Input
                              id="logFile"
                              type="file"
                              accept=".bin,.log"
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                              Browse Files
                            </Button>
                          </div>
                          <p className="text-neutral-500 text-xs">Supported formats: .bin, .log</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleCompleteTask}
                  disabled={isSubmitting || !logFile}
                >
                  {isFileUploading ? 'Uploading Log File...' : isSubmitting ? 'Processing...' : 'Complete Task'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}
