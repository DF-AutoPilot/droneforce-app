'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { logBlockchain, logError } from '@/lib/logger';
import { blockchainService } from '@/services';
import { Task } from '@/types/task';

interface ClaimPaymentButtonProps {
  task: Task;
  onPaymentClaimed: () => void;
}

export function ClaimPaymentButton({ task, onPaymentClaimed }: ClaimPaymentButtonProps) {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [claiming, setClaiming] = useState(false);

  // Only show the button if:
  // 1. Task is verified
  // 2. Current wallet is the operator's wallet
  // 3. Payment hasn't been claimed yet
  // 4. Task has escrow payment initialized
  const canClaim = 
    task.status === 'verified' && 
    !!publicKey && 
    publicKey.toString() === task.operator &&
    !task.paymentClaimed && 
    task.paymentEscrow?.initialized;

  if (!canClaim) {
    return null;
  }

  const handleClaimPayment = async () => {
    if (!publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      setClaiming(true);
      toast.info('Claiming payment...');

      // Call the blockchain service to claim escrow payment
      const txSignature = await blockchainService.claimEscrowPayment(
        wallet, // Pass the complete wallet adapter
        task.id
      );

      logBlockchain('Payment claim transaction complete', {
        taskId: task.id,
        txSignature,
        operator: publicKey.toString()
      });

      toast.success('Payment claimed successfully!');
      
      // Notify parent component that payment is claimed
      onPaymentClaimed();
    } catch (error: any) {
      logError('Error claiming payment', error);
      toast.error(`Failed to claim payment: ${error.message}`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="p-3 bg-green-950/30 border border-green-800 rounded-md mb-2">
        <h3 className="text-green-300 font-medium">Payment Available</h3>
        <p className="text-sm text-green-200">
          You've successfully completed this task and it has been verified.
          You can now claim your payment of {task.paymentAmount || '?'} SOL.
        </p>
      </div>
      <Button
        onClick={handleClaimPayment}
        disabled={claiming}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {claiming ? 'Processing...' : 'Claim Payment'}
      </Button>
    </div>
  );
}
