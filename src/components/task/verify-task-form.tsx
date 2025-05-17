/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';

import { Form } from '@/components/ui/form';
import { FormField } from '@/components/ui/form-field';
import { CheckboxField } from '@/components/ui/checkbox-field';
import { logBlockchain, logError } from '@/lib/logger';
import { verifyTask } from '@/lib/api';
import { blockchainService } from '@/services';
import { Task } from '@/types/task';

interface VerifyTaskFormProps {
  task: Task;
  onVerificationComplete: () => void;
}

export function VerifyTaskForm({ task, onVerificationComplete }: VerifyTaskFormProps) {
  const wallet = useWallet();
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } = wallet;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationData, setVerificationData] = useState({
    verificationResult: true,
    verificationReportHash: ''
  });

  // Check if task is in the right state to be verified
  const canVerify = task.status === 'completed' && !task.verificationResult;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVerificationData({
      ...verificationData,
      [name]: value
    });
  };

  const handleCheckboxChange = (checked: boolean) => {
    setVerificationData({
      ...verificationData,
      verificationResult: checked
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

      // Call the blockchain service to handle verification
      const { verificationTx, blockchainSuccess } = await blockchainService.verifyTask(
        wallet, // Pass the complete wallet adapter
        task.id,
        verificationData.verificationResult,
        verificationData.verificationReportHash
      );

      logBlockchain('Verification transaction complete', {
        taskId: task.id,
        verificationTx,
        result: verificationData.verificationResult,
        blockchainSuccess
      });

      // Update Firestore with verification result
      await verifyTask(
        task.id,
        verificationData.verificationResult,
        verificationData.verificationReportHash
      );

      // Display appropriate message based on verification result and escrow status
      if (verificationData.verificationResult) {
        if (task.paymentEscrow?.initialized) {
          toast.success('Task verified successfully. Operator can now claim payment.');
        } else {
          toast.success('Task verified successfully');
        }
      } else {
        toast.info('Task verification failed - task marked as rejected');
      }

      // Notify parent component that verification is complete
      onVerificationComplete();

      // Reset form (though typically not needed as form is hidden after verification)
      setVerificationData({
        verificationResult: true,
        verificationReportHash: ''
      });
    } catch (error: any) {
      logError('Error verifying task', error);
      toast.error(`Failed to verify task: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canVerify) {
    return null;
  }

  // Only validator account should see this form
  const isValidator = publicKey?.toString() === process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY;
  if (!isValidator) {
    return null;
  }

  // Check if task has a payment escrow
  const hasEscrow = !!task.paymentEscrow?.initialized;

  return (
    <Form
      title="Verify Task Completion"
      description={
        hasEscrow
          ? "Verify task logs and release payment to operator if successful"
          : "Verify task logs and record verification status"
      }
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? 'Verifying...' : 'Submit Verification'}
      isSubmitting={isSubmitting}
    >
      <CheckboxField
        id="verificationResult"
        label="Validation Result"
        checked={verificationData.verificationResult}
        onCheckedChange={handleCheckboxChange}
        helpText="Check if the task was completed successfully"
      />

      <FormField
        id="verificationReportHash"
        name="verificationReportHash"
        label="Verification Report Hash"
        placeholder="0x..."
        value={verificationData.verificationReportHash}
        onChange={handleChange}
        required
        helpText="SHA-256 hash of verification report"
      />

      {hasEscrow && (
        <div className="mt-4 p-3 bg-blue-950/30 border border-blue-800 rounded-md">
          <p className="text-sm text-blue-300">
            <strong>Payment Escrow Active:</strong> Verifying this task as successful will release{' '}
            <span className="font-medium">{task.paymentAmount} payment tokens</span> to the operator.
          </p>
        </div>
      )}
    </Form>
  );
}
