import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Initialize connection to Solana network
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Get program ID from environment variable
export const programId = new PublicKey(
  process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || ''
);

// Get validator pubkey from environment variable
export const validatorPubkey = new PublicKey(
  process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY || ''
);

// Program instruction layouts
export const createTaskInstruction = (
  wallet: PublicKey,
  taskId: string, 
  location: string,
  areaSize: number,
  altitude: number,
  duration: number,
  geofencingEnabled: boolean,
  description: string
) => {
  // In a real implementation, this would encode the instruction data
  // according to the contract's specification
  return {
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: validatorPubkey, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([
      /* encoded instruction data would go here */
    ]),
  };
};

export const acceptTaskInstruction = (
  wallet: PublicKey,
  taskId: string
) => {
  return {
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([
      /* encoded instruction data would go here */
    ]),
  };
};

export const completeTaskInstruction = (
  wallet: PublicKey,
  taskId: string,
  arweaveTxId: string,
  logHash: string,
  signature: string
) => {
  return {
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([
      /* encoded instruction data would go here */
    ]),
  };
};

export const recordVerificationInstruction = (
  wallet: PublicKey,
  taskId: string,
  verificationResult: boolean,
  verificationReportHash: string
) => {
  return {
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
    ],
    data: Buffer.from([
      /* encoded instruction data would go here */
    ]),
  };
};
