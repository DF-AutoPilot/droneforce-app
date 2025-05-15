/**
 * DroneForce Protocol Task Interface
 * Represents a drone booking task with all its properties
 */
export interface EscrowPayment {
  initialized: boolean;
  tokenMint: string;
  amount: number;
  escrowTxSignature: string;
  acceptedTxSignature?: string;
  cancelledTxSignature?: string;
}

export interface Task {
  id: string;
  creator: string;
  operator?: string;
  location: string;
  areaSize: number;
  altitude: number;
  duration: number;
  geofencingEnabled: boolean;
  description: string;
  status: 'created' | 'accepted' | 'completed' | 'verified';
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  verifiedAt?: number;
  arweaveTxId?: string;
  logHash?: string;
  signature?: string;
  verificationResult?: boolean;
  verificationReportHash?: string;
  paymentEscrow?: EscrowPayment;
  paymentAmount?: number;
  selectedToken?: string;
  paymentClaimed?: boolean;  // Added for escrow payment claiming
  paymentClaimTx?: string;   // Transaction signature when payment was claimed
}
