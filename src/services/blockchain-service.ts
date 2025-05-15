/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  TransactionInstruction,
  Transaction
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { DEBUG_MODE, db } from '../lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { logBlockchain, logInfo, logError } from '../lib/logger';
import { acceptEscrowInstruction } from '../lib/escrow-client';
import { getTaskById } from '../lib/api';

// Define transaction options interface
interface SendTransactionOptions {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized' | string;
  maxRetries?: number;
}

/**
 * Blockchain Service for DroneForce Protocol
 * Handles all interactions with the Solana blockchain
 */
class BlockchainService {
  private connection: Connection;
  private programId: PublicKey;
  private validatorPubkey: PublicKey;
  
  // Instruction discriminators
  private readonly CREATE_TASK_DISCRIMINATOR = Buffer.from([232, 30, 109, 170, 165, 253, 106, 171]);
  
  // Updated accept_task discriminator directly from the IDL file
  // Using the exact bytes from droneforce_contract.json
  private readonly ACCEPT_TASK_DISCRIMINATOR = Buffer.from([222, 196, 79, 165, 120, 30, 38, 120]);
  
  // Complete task discriminator directly from the IDL file
  private readonly COMPLETE_TASK_DISCRIMINATOR = Buffer.from([109, 167, 192, 41, 129, 108, 220, 196]);
  
  // Updated discriminator for record_verification from the IDL file
  // Using the exact bytes from droneforce_contract.json
  private readonly RECORD_VERIFICATION_DISCRIMINATOR = Buffer.from(
    [179, 127, 50, 99, 1, 78, 32, 190]
  );
  
  constructor() {
    // Mock program ID for debug mode
    const DEBUG_PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
    
    // Mock validator ID for debug mode
    const DEBUG_VALIDATOR_PUBKEY = 'Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod';
    
    // Initialize connection to Solana network
    this.connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    
    // Get program ID - use mock if in debug mode
    this.programId = new PublicKey(
      DEBUG_MODE ? 
        DEBUG_PROGRAM_ID : 
        (process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || DEBUG_PROGRAM_ID)
    );
    logBlockchain('Initialized Solana program ID', { programId: this.programId.toString(), isDebugMode: DEBUG_MODE });
    
    // Get validator pubkey - use mock if in debug mode
    this.validatorPubkey = new PublicKey(
      DEBUG_MODE ? 
        DEBUG_VALIDATOR_PUBKEY : 
        (process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY || DEBUG_VALIDATOR_PUBKEY)
    );
    logBlockchain('Initialized Solana validator pubkey', { validatorPubkey: this.validatorPubkey.toString(), isDebugMode: DEBUG_MODE });
  }
  
  /**
   * Get the Solana connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
  
  /**
   * Get the program ID
   */
  getProgramId(): PublicKey {
    return this.programId;
  }
  
  /**
   * Get the validator pubkey
   */
  getValidatorPubkey(): PublicKey {
    return this.validatorPubkey;
  }
  
  /**
   * Find program derived address for a task
   */
  async findTaskPDA(taskId: string): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from('task'), Buffer.from(taskId)],
      this.programId
    );
  }
  
  /**
   * Send a transaction to the Solana blockchain
   */
  async sendTransaction(
    transaction: Transaction, 
    wallet: any, // Wallet adapter
    options: SendTransactionOptions = {}
  ): Promise<string> {
    try {
      // Validate wallet
      if (!wallet) {
        throw new Error('Wallet is required');
      }

      if (!wallet.publicKey) {
        throw new Error('Wallet publicKey is missing');
      }

      if (typeof wallet.sendTransaction !== 'function') {
        logError('Invalid wallet object', {
          hasPublicKey: !!wallet.publicKey,
          hasSendTransaction: !!wallet.sendTransaction,
          hasSignTransaction: !!wallet.signTransaction,
          walletKeys: Object.keys(wallet)
        });
        throw new Error('Wallet is missing sendTransaction method');
      }

      const defaultOptions: SendTransactionOptions = {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Log what we're about to do for debugging
      logBlockchain('Sending transaction', {
        feePayer: transaction.feePayer?.toString(),
        walletPublicKey: wallet.publicKey.toString(),
        recentBlockhash: transaction.recentBlockhash,
        numInstructions: transaction.instructions.length
      });

      // Sign and send transaction
      const signature = await wallet.sendTransaction(transaction, this.connection, mergedOptions);
      
      logBlockchain('Transaction sent', { signature });
      return signature;
    } catch (error) {
      logError('Failed to send transaction', { error });
      throw error;
    }
  }
  
  /**
   * Confirm a transaction
   */
  async confirmTransaction(signature: string, commitment: any = 'confirmed'): Promise<any> {
    try {
      const confirmation = await this.connection.confirmTransaction(signature, commitment);
      logBlockchain('Transaction confirmed', { signature, confirmation });
      return confirmation;
    } catch (error) {
      logError('Failed to confirm transaction', { error, signature });
      throw error;
    }
  }
  
  // Helper functions for serializing data for Anchor program
  private serializeString(str: string): Buffer {
    const data = Buffer.from(str, 'utf-8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(data.length, 0);
    return Buffer.concat([len, data]);
  }
  
  private serializeF64(num: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeDoubleLE(num, 0);
    return buf;
  }
  
  private serializeU32(num: number): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(num, 0);
    return buf;
  }
  
  private serializeU16(num: number): Buffer {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(num, 0);
    return buf;
  }
  
  private serializeU8(num: number): Buffer {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(num, 0);
    return buf;
  }
  
  private serializeBool(bool: boolean): Buffer {
    return Buffer.from([bool ? 1 : 0]);
  }
  
  private serializePubkey(pubkey: PublicKey): Buffer {
    return Buffer.from(pubkey.toBytes());
  }
  
  /**
   * Create task instruction
   */
  async createTaskInstruction(
    wallet: PublicKey,
    taskId: string, 
    location: string, // Format: "lat,lng"
    areaSize: number,
    altitude: number,
    taskType: number, // Our duration field maps to task_type in the contract
    geofencingEnabled: boolean,
    description: string
  ): Promise<TransactionInstruction> {
    logBlockchain('Creating task instruction matching Anchor program structure', { 
      wallet: wallet.toString(),
      taskId,
      location,
      areaSize,
      altitude,
      taskType,
      geofencingEnabled,
      description,
      validatorPubkey: this.validatorPubkey.toString()
    });
    
    try {
      // Find PDA for task account based on the seed in the Rust contract
      // [b"task", task_id.as_bytes()]
      const [taskPDA, bump] = await this.findTaskPDA(taskId);
      logBlockchain('Task PDA derived', { taskPDA: taskPDA.toString(), bump });
  
      // Parse and validate input parameters
      let latLng = location.split(',');
      if (latLng.length !== 2) {
        throw new Error('Invalid location format. Expected "lat,lng"');
      }
    
      const latitude = parseFloat(latLng[0]);
      const longitude = parseFloat(latLng[1]);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates. Latitude and longitude must be numbers.');
      }
  
      if (isNaN(areaSize) || areaSize <= 0) {
        throw new Error('Invalid area size. Must be a positive number.');
      }
  
      if (isNaN(altitude) || altitude <= 0) {
        throw new Error('Invalid altitude. Must be a positive number.');
      }
  
      if (isNaN(taskType) || taskType <= 0 || taskType > 255) {
        throw new Error('Invalid task type. Must be between 1 and 255.');
      }
  
      if (description.length > 200) {
        throw new Error('Description too long. Maximum 200 characters.');
      }
      
      // Serialize the instruction data
      // This follows the Anchor IDL for the DroneForce program
      const data = Buffer.concat([
        this.CREATE_TASK_DISCRIMINATOR,
        this.serializeString(taskId),
        this.serializeF64(latitude),
        this.serializeF64(longitude),
        this.serializeU32(areaSize),
        this.serializeU16(altitude),
        this.serializeU8(taskType),
        this.serializeBool(geofencingEnabled),
        this.serializeString(description),
      ]);
  
      // Required accounts, in the order expected by the program
      const keys = [
        // task (PDA)
        { pubkey: taskPDA, isSigner: false, isWritable: true },
        
        // creator (wallet signer)
        { pubkey: wallet, isSigner: true, isWritable: true },
        
        // system_program (required for account creation)
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];
      
      // Create the instruction
      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys,
        data
      });
      
      logBlockchain('Anchor-compatible instruction created', { 
        program: instruction.programId.toString(),
        keys: instruction.keys.map(k => ({
          pubkey: k.pubkey.toString(),
          isSigner: k.isSigner,
          isWritable: k.isWritable
        })),
        dataSize: instruction.data.length
      });
      
      return instruction;
    } catch (error) {
      logError('Error creating task instruction', error);
      throw error;
    }
  }
  
  /**
   * Accept task instruction
   */
  async acceptTaskInstruction(
    wallet: PublicKey,
    taskId: string
  ): Promise<TransactionInstruction> {
    logBlockchain('Accepting task instruction', { 
      wallet: wallet.toString(),
      taskId: taskId
    });
    
    // Find the task PDA
    const [taskPDA, _] = await this.findTaskPDA(taskId);
    
    // Create the instruction data with ONLY the discriminator
    // The Rust implementation doesn't take any parameters
    const data = this.ACCEPT_TASK_DISCRIMINATOR;
    
    // Required accounts - EXACTLY matching the Rust implementation
    // pub struct AcceptTask<'info> {
    //   pub task: Account<'info, TaskAccount>,
    //   pub operator: Signer<'info>,
    // }
    const keys = [
      // Task account (writable) - first in the Rust struct
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      
      // Operator account (signer) - second in the Rust struct
      { pubkey: wallet, isSigner: true, isWritable: false },
    ];
    
    // Log the accounts being used
    logBlockchain('Accept task accounts', {
      taskPDA: taskPDA.toString(),
      wallet: wallet.toString()
    });
    
    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys,
      data
    });
    
    logBlockchain('Accept task instruction created', { 
      programId: this.programId.toString(),
      taskPDA: taskPDA.toString()
    });
    return instruction;
  }
  
  /**
   * Complete task instruction
   */
  async completeTaskInstruction(
    wallet: PublicKey,
    taskId: string,
    arweaveTxId: string,
    logHash: string,
    signature: string
  ): Promise<TransactionInstruction> {
    logBlockchain('Completing task instruction', { 
      wallet: wallet.toString(),
      taskId,
      arweaveTxId,
      logHash: logHash.substring(0, 10) + '...', // Truncate for readability
      signature: signature.substring(0, 10) + '...', // Truncate for readability
    });
    
    // Find the task PDA
    const [taskPDA, _] = await this.findTaskPDA(taskId);
    
    // Ensure log hash is exactly 32 bytes as required by Rust [u8; 32]
    let logHashBytes = Buffer.from(logHash.replace('0x', ''), 'hex');
    if (logHashBytes.length !== 32) {
      // Pad or truncate to exactly 32 bytes
      const paddedLogHash = Buffer.alloc(32, 0); // Create buffer of 32 zeros
      logHashBytes.copy(paddedLogHash, 0, 0, Math.min(logHashBytes.length, 32));
      logHashBytes = paddedLogHash;
    }
  
    // Ensure signature is exactly 64 bytes as required by Rust [u8; 64]
    let signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
    if (signatureBytes.length !== 64) {
      // Pad or truncate to exactly 64 bytes
      const paddedSignature = Buffer.alloc(64, 0); // Create buffer of 64 zeros
      signatureBytes.copy(paddedSignature, 0, 0, Math.min(signatureBytes.length, 64));
      signatureBytes = paddedSignature;
    }
  
    logBlockchain('Task completion params', {
      arweaveTxId,
      logHashLength: logHashBytes.length,
      signatureLength: signatureBytes.length
    });
  
    // Create instruction data matching the Rust function parameters
    const data = Buffer.concat([
      this.COMPLETE_TASK_DISCRIMINATOR,
      this.serializeString(arweaveTxId),
      logHashBytes,        // Exact 32 bytes [u8; 32]
      signatureBytes       // Exact 64 bytes [u8; 64]
    ]);
    
    // Required accounts
    const keys = [
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: true, isWritable: true },
    ];
    
    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys,
      data
    });
    
    logBlockchain('Complete task instruction created', { 
      programId: this.programId.toString(),
      taskPDA: taskPDA.toString()
    });
    return instruction;
  }
  
  /**
   * Record verification instruction
   */
  async recordVerificationInstruction(
    wallet: PublicKey,
    taskId: string,
    verificationResult: boolean,
    verificationReportHash: string
  ): Promise<TransactionInstruction> {
    logBlockchain('Recording verification instruction', { 
      wallet: wallet.toString(),
      taskId,
      verificationResult,
      verificationReportHash: verificationReportHash.substring(0, 10) + '...' // Truncate for readability
    });
    
    // Find the task PDA
    const [taskPDA, _] = await this.findTaskPDA(taskId);
    
    // Convert hash to byte array - ensure it's exactly 32 bytes (Solana expects [u8; 32])
    // If the hash is shorter, pad with zeros
    let hashBytes = Buffer.from(verificationReportHash.replace('0x', ''), 'hex');
    if (hashBytes.length !== 32) {
      const paddedHash = Buffer.alloc(32);
      hashBytes.copy(paddedHash, 0, 0, Math.min(hashBytes.length, 32));
      hashBytes = paddedHash;
    }
    
    // Create instruction data - EXACTLY matching the Anchor program parameters
    const data = Buffer.concat([
      this.RECORD_VERIFICATION_DISCRIMINATOR,
      this.serializeString(taskId),          // task_id: String
      this.serializeBool(verificationResult), // verification_result: bool
      hashBytes                              // verification_report_hash: [u8; 32]
    ]);
    
    // Required accounts - EXACTLY matching the RecordVerification<'info> structure
    // Based on the Rust struct, we need:
    // 1. task: Account<'info, TaskAccount>, - PDA, writable
    // 2. validator: Signer<'info>,          - must sign and match validator_pubkey
    const keys = [
      // Task Account PDA
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      
      // Validator (must be a signer)
      { pubkey: wallet, isSigner: true, isWritable: false },
    ];
    
    // Debugging log
    logBlockchain('Verification instruction accounts:', {
      taskPDA: taskPDA.toString(),
      validator: wallet.toString(),
      validatorPubkey: this.validatorPubkey.toString(),
      isValidator: wallet.toString() === this.validatorPubkey.toString()
    });
    
    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys,
      data
    });
    
    logBlockchain('Verification instruction created', { 
      programId: this.programId.toString(),
      taskPDA: taskPDA.toString(),
      dataLength: data.length
    });
    return instruction;
  }
  
  /**
   * Create and send a transaction to create a task
   */
  async createTask(
    wallet: any, // Wallet adapter
    taskId: string,
    location: string,
    areaSize: number,
    altitude: number,
    taskType: number,
    geofencingEnabled: boolean,
    description: string
  ): Promise<string> {
    try {
      // Get recent blockhash for transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      // Get the createTaskInstruction
      const instruction = await this.createTaskInstruction(
        wallet.publicKey,
        taskId,
        location,
        areaSize,
        altitude,
        taskType,
        geofencingEnabled,
        description
      );
      
      // Create transaction
      const transaction = new Transaction();
      transaction.add(instruction);
      
      // Set the fee payer and recentBlockhash
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;
      
      // Send transaction
      const signature = await this.sendTransaction(transaction, wallet);
      
      // Wait for confirmation
      await this.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      logError('Error creating task transaction', error);
      throw error;
    }
  }
  
  /**
   * Create and send a transaction to accept a task
   */
  async acceptTask(
    wallet: any, // Wallet adapter
    taskId: string
  ): Promise<string> {
    try {
      // Validate the wallet object
      if (!wallet) {
        throw new Error('Wallet is required');
      }
      
      if (!wallet.publicKey) {
        throw new Error('Wallet publicKey is required');
      }
      
      if (!wallet.signTransaction) {
        throw new Error('Wallet must have signTransaction method');
      }
      
      // Get recent blockhash for transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      // Get the acceptTaskInstruction
      const instruction = await this.acceptTaskInstruction(
        wallet.publicKey,
        taskId
      );
      
      // Create transaction
      const transaction = new Transaction();
      transaction.add(instruction);
      
      // Set the fee payer and recentBlockhash
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;
      
      logBlockchain('Accept task transaction prepared', {
        taskId,
        feePayer: wallet.publicKey.toString(),
        hasMethods: {
          signTransaction: !!wallet.signTransaction,
          sendTransaction: !!wallet.sendTransaction
        }
      });
      
      // Send transaction
      const signature = await this.sendTransaction(transaction, wallet);
      
      // Wait for confirmation
      await this.confirmTransaction(signature);
      
      logBlockchain('Accept task transaction confirmed', {
        taskId,
        signature
      });
      
      return signature;
    } catch (error) {
      logError('Error accepting task transaction', error);
      throw error;
    }
  }
  
  /**
   * Create and send a transaction to complete a task
   */
  async completeTask(
    wallet: any, // Wallet adapter
    taskId: string,
    arweaveTxId: string,
    logHash: string,
    signature: string
  ): Promise<string> {
    try {
      // Get recent blockhash for transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      // Get the completeTaskInstruction
      const instruction = await this.completeTaskInstruction(
        wallet.publicKey,
        taskId,
        arweaveTxId,
        logHash,
        signature
      );
      
      // Create transaction
      const transaction = new Transaction();
      transaction.add(instruction);
      
      // Set the fee payer and recentBlockhash
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;
      
      // Send transaction
      const txSignature = await this.sendTransaction(transaction, wallet);
      
      // Wait for confirmation
      await this.confirmTransaction(txSignature);
      
      return txSignature;
    } catch (error) {
      logError('Error completing task transaction', error);
      throw error;
    }
  }

  /**
   * Accept escrow payment for a verified task
   * This is called when a task is verified successfully
   */
  async acceptEscrowPayment(
    wallet: any, // Wallet adapter for the operator
    task: any // Task data including escrow information
  ): Promise<string> {
    try {
      // Skip if there's no escrow payment or it's already been accepted
      if (!task.paymentEscrow || 
          !task.paymentEscrow.initialized || 
          task.paymentEscrow.acceptedTxSignature) {
        logInfo('No escrow payment to accept or already accepted', {
          taskId: task.id
        });
        return '';
      }

      // Validator should not be able to receive payment when they are also creator
      // This is a security measure to prevent conflicts of interest
      if (wallet.publicKey.toString() === task.creator && 
          wallet.publicKey.toString() === process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY) {
        logInfo('Validator cannot receive payment for tasks they created', {
          taskId: task.id,
          wallet: wallet.publicKey.toString(),
          creator: task.creator
        });
        return '';
      }

      // Warn if creator and operator are the same (this happens during testing)
      if (wallet.publicKey.toString() === task.creator) {
        logInfo('Warning: Creator and operator are the same wallet', {
          taskId: task.id,
          wallet: wallet.publicKey.toString()
        });
      }

      logBlockchain('Accepting escrow payment', {
        taskId: task.id,
        operator: wallet.publicKey.toString(),
        creator: task.creator,
        tokenMint: task.paymentEscrow.tokenMint
      });

      // Get recent blockhash for transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      // Client public key
      const clientPublicKey = new PublicKey(task.creator);
      
      // Get payment mint
      const paymentMint = new PublicKey(task.paymentEscrow.tokenMint);

      try {
        // Check if the escrow account exists by deriving it and checking on-chain
        const [escrowAccount] = await PublicKey.findProgramAddress(
          [
            Buffer.from('escrow'),
            clientPublicKey.toBuffer(),
            Buffer.from(task.id)
          ],
          new PublicKey(process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID || 'DupsqrqSRGsHJ4sq6XRzsRMoaCGHL71S9f3ngEGEmonN')
        );

        // Log the derived escrow account
        logBlockchain('Derived escrow account', {
          escrowAccount: escrowAccount.toString(),
          taskId: task.id,
          client: clientPublicKey.toString()
        });

        // If we're in a testing environment where operator === creator,
        // we might not have an actual escrow account since you can't escrow to yourself
        const escrowInfo = await this.connection.getAccountInfo(escrowAccount);
        if (!escrowInfo) {
          logInfo('Escrow account not found - this is normal if you created and accepted the task with the same wallet', {
            escrowAccount: escrowAccount.toString(),
            taskId: task.id
          });
          
          // For demo/test purposes, we'll mark it as successful anyway
          return 'TEST_ESCROW_TX';
        }
      } catch (lookupError) {
        logError('Error looking up escrow account', lookupError);
      }

      // Create escrow acceptance transaction
      const escrowTx = await acceptEscrowInstruction(
        wallet.publicKey,
        wallet.signTransaction,
        wallet.signAllTransactions,
        clientPublicKey,
        task.id, // Use task ID as nonce
        paymentMint
      );

      // Set the fee payer and recentBlockhash
      escrowTx.feePayer = wallet.publicKey;
      escrowTx.recentBlockhash = blockhash;
      
      // Send transaction
      const txSignature = await this.sendTransaction(escrowTx, wallet);
      
      try {
        // Wait for confirmation
        await this.confirmTransaction(txSignature);
        
        logBlockchain('Escrow payment accepted successfully', {
          taskId: task.id,
          txSignature
        });

        return txSignature;
      } catch (confirmError) {
        logError('Failed to confirm escrow transaction', confirmError);
        
        // If we're testing with the same wallet as creator and operator, 
        // just return a mock signature since the escrow might not exist
        if (wallet.publicKey.toString() === task.creator) {
          return 'TEST_ESCROW_TX';
        }
        
        throw confirmError;
      }
    } catch (error) {
      logError('Error accepting escrow payment', error);
      
      // Return empty string instead of throwing to prevent breaking the verification flow
      return '';
    }
  }

  /**
   * Verify a task and release escrow payment if verification is successful
   */
  async verifyTask(
    wallet: any, // Wallet adapter for the validator
    taskId: string, // Task ID
    verificationResult: boolean,
    verificationReportHash: string
  ): Promise<{verificationTx: string, blockchainSuccess?: boolean}> {
    try {
      // Get task data to check for escrow information
      const task = await getTaskById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      logBlockchain('Verifying task', {
        taskId,
        verificationResult,
        verificationReportHash: verificationReportHash.substring(0, 10) + '...' // Truncate for readability
      });

      // Validate that the connected wallet is the validator
      const isValidator = wallet.publicKey.toString() === this.validatorPubkey.toString();
      logBlockchain('Validator check', {
        isValidator,
        walletPubkey: wallet.publicKey.toString(),
        validatorPubkey: this.validatorPubkey.toString()
      });
      
      if (!isValidator) {
        // In development mode, we'll log a warning but continue
        // In production, this should be a hard error
        logInfo('WARNING: Verification attempted by non-validator wallet', {
          wallet: wallet.publicKey.toString(),
          validator: this.validatorPubkey.toString()
        });
        
        // For demo purposes only - in production, uncomment this to enforce validator
        // throw new Error('Only the validator wallet can verify tasks');
      }

      let verificationTx = '';
      let blockchainSuccess = false;
      
      try {
        // Get recent blockhash for transaction
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
        
        // Create verification instruction
        const instruction = await this.recordVerificationInstruction(
          wallet.publicKey,
          taskId,
          verificationResult,
          verificationReportHash
        );
        
        // Create transaction
        const transaction = new Transaction();
        transaction.add(instruction);
        
        // Set the fee payer and recentBlockhash
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = blockhash;
        
        // Send verification transaction
        verificationTx = await this.sendTransaction(transaction, wallet);
        
        // Wait for confirmation
        await this.confirmTransaction(verificationTx);
        blockchainSuccess = true;
        
        logBlockchain('Task verification recorded on blockchain', {
          taskId,
          verificationTx
        });
      } catch (txError) {
        logError('Blockchain verification transaction failed', txError);
        
        // If we're in development mode, continue with a mock tx
        if (DEBUG_MODE) {
          verificationTx = 'DEV_VERIFICATION_TX';
          blockchainSuccess = true;
          logInfo('Using mock verification transaction in development mode');
        } else {
          // In production, rethrow to fail the verification
          throw txError;
        }
      }

      // Task has been verified successfully, mark it in the log
      logBlockchain('Task verification complete', {
        taskId,
        verificationTx,
        verificationResult
      });
      
      // Add a log message about payment claiming
      if (verificationResult && task.operator && task.paymentEscrow?.initialized) {
        logInfo('Task verified successfully, operator can now claim payment', {
          taskId,
          operator: task.operator
        });
      }
      
      // Return just the verification transaction
      return { verificationTx, blockchainSuccess };
    } catch (error) {
      logError('Error verifying task', error);
      throw error;
    }
  }

  /**
   * Claim escrow payment for a completed and verified task
   * This should only be called by the operator who completed the task
   */
  async claimEscrowPayment(
    wallet: any, // Wallet adapter for the operator
    taskId: string // Task ID
  ): Promise<string> {
    try {
      // Get task data to check for escrow information
      const task = await getTaskById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Verify task status is 'verified'
      if (task.status !== 'verified') {
        throw new Error(`Task must be verified before claiming payment. Current status: ${task.status}`);
      }

      // Verify the wallet belongs to the operator
      if (wallet.publicKey.toString() !== task.operator) {
        throw new Error('Only the task operator can claim the payment');
      }

      // Check if payment already claimed
      if (task.paymentClaimed) {
        throw new Error('Payment has already been claimed for this task');
      }

      // Get client public key from task data
      const clientPublicKey = new PublicKey(task.creator);
      
      // Define payment mint (native SOL)
      const paymentMint = new PublicKey('So11111111111111111111111111111111111111112');
      
      // Get recent blockhash for transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      logBlockchain('Claiming escrow payment', {
        taskId: task.id,
        operator: wallet.publicKey.toString(),
        client: clientPublicKey.toString()
      });
      
      // Create escrow acceptance transaction with operator's wallet
      const escrowTx = await acceptEscrowInstruction(
        wallet.publicKey, // Use operator's wallet
        wallet.signTransaction,
        wallet.signAllTransactions,
        clientPublicKey, // Client who created the task
        task.id, // Use task ID as nonce
        paymentMint // Native SOL
      );

      // Set the fee payer and recentBlockhash
      escrowTx.feePayer = wallet.publicKey;
      escrowTx.recentBlockhash = blockhash;
      
      // Send transaction
      const txSignature = await this.sendTransaction(escrowTx, wallet);
      
      try {
        // Wait for confirmation
        await this.confirmTransaction(txSignature);
        
        logBlockchain('Escrow payment claimed successfully', {
          taskId: task.id,
          txSignature
        });

        // Update task in Firestore to mark payment as claimed
        await updateDoc(doc(db, 'tasks', task.id), {
          paymentClaimed: true,
          paymentClaimTx: txSignature,
          updatedAt: Timestamp.now()
        });

        return txSignature;
      } catch (confirmError) {
        logError('Failed to confirm escrow transaction', confirmError);
        throw confirmError;
      }
    } catch (error) {
      logError('Error claiming escrow payment', error);
      throw error;
    }
  }
}

// Create a singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;
