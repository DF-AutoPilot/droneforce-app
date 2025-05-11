/* eslint-disable @typescript-eslint/no-unused-vars */
import { Connection, PublicKey } from '@solana/web3.js';
import { DEBUG_MODE } from './firebase';

// Initialize connection to Solana network
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Mock program ID for debug mode
const DEBUG_PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

// Mock validator ID for debug mode
const DEBUG_VALIDATOR_PUBKEY = 'Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod';

// Get program ID - use mock if in debug mode
export const programId = new PublicKey(
  DEBUG_MODE ? 
    DEBUG_PROGRAM_ID : 
    (process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || DEBUG_PROGRAM_ID)
);

// Get validator pubkey - use mock if in debug mode
export const validatorPubkey = new PublicKey(
  DEBUG_MODE ? 
    DEBUG_VALIDATOR_PUBKEY : 
    (process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY || DEBUG_VALIDATOR_PUBKEY)
);

// Program instruction layouts
export const createTaskInstruction = (
  wallet: PublicKey,
  _taskId: string, 
  _location: string,
  _areaSize: number,
  _altitude: number,
  _duration: number,
  _geofencingEnabled: boolean,
  _description: string
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
  _taskId: string
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
  _taskId: string,
  _arweaveTxId: string,
  _logHash: string,
  _signature: string
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
  _taskId: string,
  _verificationResult: boolean,
  _verificationReportHash: string
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
