/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Program, AnchorProvider, web3, BN, Idl } from '@project-serum/anchor';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { logBlockchain, logInfo, logError } from './logger';
import rawIdl from '../../droneforce_contract.json';

// Create a properly formatted IDL that Anchor can work with
// This involves manual conversion since our IDL format differs from what Anchor expects
const formattedIdl: Idl = {
  version: '0.1.0',
  name: 'droneforce_contract',
  instructions: [
    {
      name: 'createTask',
      accounts: [
        {
          name: 'task',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'creator',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'taskId',
          type: 'string',
        },
        {
          name: 'locationLat',
          type: 'f64',
        },
        {
          name: 'locationLng',
          type: 'f64',
        },
        {
          name: 'areaSize',
          type: 'u32',
        },
        {
          name: 'taskType',
          type: 'u8',
        },
        {
          name: 'altitude',
          type: 'u16',
        },
        {
          name: 'geofencingEnabled',
          type: 'bool',
        },
        {
          name: 'description',
          type: 'string',
        },
        {
          name: 'validatorPubkey',
          type: 'publicKey',
        },
      ],
    },
    {
      name: 'acceptTask',
      accounts: [
        {
          name: 'task',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'operator',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: 'completeTask',
      accounts: [
        {
          name: 'task',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'operator',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'arweaveTxId',
          type: 'string',
        },
        {
          name: 'logHash',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'signature',
          type: {
            array: ['u8', 64],
          },
        },
      ],
    },
    {
      name: 'recordVerification',
      accounts: [
        {
          name: 'task',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'validator',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'taskId',
          type: 'string',
        },
        {
          name: 'verificationResult',
          type: 'bool',
        },
        {
          name: 'verificationReportHash',
          type: {
            array: ['u8', 32],
          },
        },
      ],
    },
  ],
};

// Create a connection to the Solana network
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// The Solana program ID from the environment (or from raw IDL if needed)
export const programId = new PublicKey(
  process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || 
  (rawIdl as any).address || 
  'ABHeKDbJ82GEeTAH7K6eNgXZFmLGzSrYFFTvZUtyksfJ'
);

// Get validator pubkey from environment
export const validatorPubkey = new PublicKey(
  process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY || '3GjQjMoiqF7h5M7z2h2wjBZq2n9HafpuXp6puXAUtUhb'
);

// Function to derive PDA for task account
export const findTaskPDA = async (taskId: string): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from('task'), Buffer.from(taskId)],
    programId
  );
};

// Create Anchor provider with wallet
const createAnchorProvider = (wallet: any) => {
  return new AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: 'confirmed' }
  );
};

// Create a program interface with IDL
const createProgram = (provider: AnchorProvider) => {
  return new Program(formattedIdl, programId, provider);
};

// Helper to create a wallet adapter that the Anchor provider can use
const createWalletAdapter = (pubkey: PublicKey, signTransaction: any, signAllTransactions: any) => {
  return {
    publicKey: pubkey,
    signTransaction,
    signAllTransactions,
    signMessage: async (message: Uint8Array) => ({ signature: new Uint8Array(0), publicKey: pubkey }),
    connect: async () => {},
    disconnect: async () => {}
  };
};

// Create Task instruction using Anchor
export const createTaskInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  taskId: string,
  location: string,
  areaSize: number,
  altitude: number,
  taskType: number,
  geofencingEnabled: boolean,
  description: string
) => {
  try {
    logBlockchain('Creating task using Anchor IDL', {
      taskId,
      wallet: wallet.toString(),
    });

    // Validate and normalize inputs
    let inputTaskId = taskId.replace(/[^a-zA-Z0-9-_]/g, '');
    if (inputTaskId.length < 3) inputTaskId = `task-${Date.now()}`;
    if (inputTaskId.length > 30) inputTaskId = inputTaskId.substring(0, 30);
    
    // Parse location
    let locationLat = 0.0;
    let locationLng = 0.0;
    try {
      const [latStr, lngStr] = location.split(',');
      locationLat = parseFloat(latStr.trim());
      locationLng = parseFloat(lngStr.trim());
      
      if (isNaN(locationLat) || locationLat < -90 || locationLat > 90) locationLat = 37.7749;
      if (isNaN(locationLng) || locationLng < -180 || locationLng > 180) locationLng = -122.4194;
    } catch (e) {
      locationLat = 37.7749;
      locationLng = -122.4194;
      logError('Failed to parse location coordinates, using defaults', e);
    }
    
    // Validate numeric inputs
    const validatedAreaSize = Math.min(Math.max(0, isNaN(areaSize) ? 100 : areaSize), 4294967295);
    const validatedTaskType = Math.min(Math.max(0, isNaN(taskType) ? 1 : taskType), 255);
    const validatedAltitude = Math.min(Math.max(0, isNaN(altitude) ? 50 : altitude), 65535);
    
    // Validate description
    let validatedDescription = description || "Drone task";
    if (validatedDescription.length > 200) {
      validatedDescription = validatedDescription.substring(0, 200);
    }

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the PDA for the task account
    const [taskPDA] = await findTaskPDA(inputTaskId);
    
    // Prepare the transaction for create_task
    const tx = await program.methods
      .createTask(
        inputTaskId,
        locationLat,
        locationLng,
        new BN(validatedAreaSize),
        validatedTaskType,
        validatedAltitude,
        geofencingEnabled,
        validatedDescription,
        validatorPubkey
      )
      .accounts({
        task: taskPDA,
        creator: wallet,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created task transaction with Anchor', {
      taskPDA: taskPDA.toString(),
      tx: tx.instructions.length,
    });
    
    return tx;
  } catch (error) {
    logError('Error creating task with Anchor', error);
    throw error;
  }
};

// Accept Task instruction using Anchor
export const acceptTaskInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  taskId: string
) => {
  try {
    logBlockchain('Accepting task using Anchor IDL', {
      taskId,
      wallet: wallet.toString(),
    });

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the PDA for the task account
    const [taskPDA] = await findTaskPDA(taskId);
    
    // Prepare the transaction for accept_task
    const tx = await program.methods
      .acceptTask()
      .accounts({
        task: taskPDA,
        operator: wallet,
      })
      .transaction();
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created accept task transaction with Anchor', {
      taskPDA: taskPDA.toString(),
      tx: tx.instructions.length,
    });
    
    return tx;
  } catch (error) {
    logError('Error accepting task with Anchor', error);
    throw error;
  }
};

// Complete Task instruction using Anchor
export const completeTaskInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  taskId: string,
  arweaveTxId: string,
  logHash: string,
  signature: string
) => {
  try {
    logBlockchain('Completing task using Anchor IDL', {
      taskId,
      wallet: wallet.toString(),
      arweaveTxId,
    });

    // Clean up the hash and signature
    const logHashBytes = Buffer.from(logHash.replace('0x', ''), 'hex');
    const signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
    
    // Validate hash and signature sizes
    if (logHashBytes.length !== 32) {
      throw new Error('Log hash must be exactly 32 bytes');
    }
    
    if (signatureBytes.length !== 64) {
      throw new Error('Signature must be exactly 64 bytes');
    }

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the PDA for the task account
    const [taskPDA] = await findTaskPDA(taskId);
    
    // Prepare the transaction for complete_task
    const tx = await program.methods
      .completeTask(
        arweaveTxId,
        Array.from(logHashBytes),
        Array.from(signatureBytes)
      )
      .accounts({
        task: taskPDA,
        operator: wallet,
      })
      .transaction();
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created complete task transaction with Anchor', {
      taskPDA: taskPDA.toString(),
      tx: tx.instructions.length,
    });
    
    return tx;
  } catch (error) {
    logError('Error completing task with Anchor', error);
    throw error;
  }
};

// Record Verification instruction using Anchor
export const recordVerificationInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  taskId: string,
  verificationResult: boolean,
  verificationReportHash: string
) => {
  try {
    logBlockchain('Recording verification using Anchor IDL', {
      taskId,
      wallet: wallet.toString(),
      verificationResult,
    });

    // Convert hash to byte array
    const reportHashBytes = Buffer.from(verificationReportHash.replace('0x', ''), 'hex');
    
    // Validate hash size
    if (reportHashBytes.length !== 32) {
      throw new Error('Verification report hash must be exactly 32 bytes');
    }

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the PDA for the task account
    const [taskPDA] = await findTaskPDA(taskId);
    
    // Prepare the transaction for record_verification
    const tx = await program.methods
      .recordVerification(
        taskId,
        verificationResult,
        Array.from(reportHashBytes)
      )
      .accounts({
        task: taskPDA,
        validator: wallet,
      })
      .transaction();
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created verification transaction with Anchor', {
      taskPDA: taskPDA.toString(),
      tx: tx.instructions.length,
    });
    
    return tx;
  } catch (error) {
    logError('Error recording verification with Anchor', error);
    throw error;
  }
};

// Fetch task data from chain (for viewing details)
export const fetchTaskData = async (taskId: string) => {
  try {
    // Find the PDA for the task
    const [taskPDA] = await findTaskPDA(taskId);
    
    // Get account info from chain
    const accountInfo = await connection.getAccountInfo(taskPDA);
    
    if (!accountInfo) {
      return null; // Account doesn't exist on chain
    }
    
    // In a real implementation, we would use the IDL to deserialize the account data
    // For now, we just return the raw account data
    return {
      exists: true,
      pubkey: taskPDA.toString(),
      data: accountInfo.data,
    };
  } catch (error) {
    logError('Error fetching task data', error);
    return null;
  }
};
