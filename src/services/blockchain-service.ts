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
import { DEBUG_MODE } from '../lib/firebase';
import { logBlockchain, logInfo, logError } from '../lib/logger';

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
  private readonly ACCEPT_TASK_DISCRIMINATOR = Buffer.from([55, 122, 245, 187, 115, 148, 27, 42]);
  private readonly COMPLETE_TASK_DISCRIMINATOR = Buffer.from([77, 150, 118, 98, 137, 89, 115, 213]);
  private readonly RECORD_VERIFICATION_DISCRIMINATOR = Buffer.from([124, 242, 93, 218, 125, 148, 45, 9]);
  
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
      const defaultOptions: SendTransactionOptions = {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
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
    
    // Create the instruction data with just the discriminator
    const data = this.ACCEPT_TASK_DISCRIMINATOR;
    
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
    
    // Convert string hash and signature to byte arrays
    const logHashBytes = Buffer.from(logHash.replace('0x', ''), 'hex');
    const signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
    
    // Create instruction data
    const data = Buffer.concat([
      this.COMPLETE_TASK_DISCRIMINATOR,
      this.serializeString(arweaveTxId),
      logHashBytes,
      signatureBytes
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
    
    // Convert hash to byte array
    const reportHashBytes = Buffer.from(verificationReportHash.replace('0x', ''), 'hex');
    
    // Create instruction data
    const data = Buffer.concat([
      this.RECORD_VERIFICATION_DISCRIMINATOR,
      this.serializeString(taskId),
      this.serializeBool(verificationResult),
      reportHashBytes
    ]);
    
    // Required accounts
    const keys = [
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: this.validatorPubkey, isSigner: true, isWritable: false },
    ];
    
    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys,
      data
    });
    
    logBlockchain('Verification instruction created', { 
      programId: this.programId.toString(),
      taskPDA: taskPDA.toString() 
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
      
      // Send transaction
      const signature = await this.sendTransaction(transaction, wallet);
      
      // Wait for confirmation
      await this.confirmTransaction(signature);
      
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
}

// Create a singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;
