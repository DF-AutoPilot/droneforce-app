/* eslint-disable @typescript-eslint/no-unused-vars */
import { Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { DEBUG_MODE } from './firebase';
import { logBlockchain, logInfo, logError } from './logger';

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
logBlockchain('Initialized Solana program ID', { programId: programId.toString(), isDebugMode: DEBUG_MODE });

// Get validator pubkey - use mock if in debug mode
export const validatorPubkey = new PublicKey(
  DEBUG_MODE ? 
    DEBUG_VALIDATOR_PUBKEY : 
    (process.env.NEXT_PUBLIC_VALIDATOR_PUBKEY || DEBUG_VALIDATOR_PUBKEY)
);
logBlockchain('Initialized Solana validator pubkey', { validatorPubkey: validatorPubkey.toString(), isDebugMode: DEBUG_MODE });

// Function to derive PDA for task account
export const findTaskPDA = async (taskId: string): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [Buffer.from('task'), Buffer.from(taskId)],
    programId
  );
};

// Anchor uses a discriminator of 8 bytes at the beginning of instructions
// This is a placeholder - in a real app you would generate this from IDL
const CREATE_TASK_DISCRIMINATOR = Buffer.from([232, 30, 109, 170, 165, 253, 106, 171]);
const ACCEPT_TASK_DISCRIMINATOR = Buffer.from([55, 122, 245, 187, 115, 148, 27, 42]);
const COMPLETE_TASK_DISCRIMINATOR = Buffer.from([77, 150, 118, 98, 137, 89, 115, 213]);
const RECORD_VERIFICATION_DISCRIMINATOR = Buffer.from([124, 242, 93, 218, 125, 148, 45, 9]);

// Helper functions for serializing data for Anchor program
function serializeString(str: string): Buffer {
  const data = Buffer.from(str, 'utf-8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(data.length, 0);
  return Buffer.concat([len, data]);
}

function serializeF64(num: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(num, 0);
  return buf;
}

function serializeU32(num: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(num, 0);
  return buf;
}

function serializeU16(num: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(num, 0);
  return buf;
}

function serializeU8(num: number): Buffer {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(num, 0);
  return buf;
}

function serializeBool(bool: boolean): Buffer {
  return Buffer.from([bool ? 1 : 0]);
}

function serializePubkey(pubkey: PublicKey): Buffer {
  return Buffer.from(pubkey.toBytes());
}

// Program instruction layouts
export const createTaskInstruction = async (
  wallet: PublicKey,
  taskId: string, 
  location: string, // Format: "lat,lng"
  areaSize: number,
  altitude: number,
  taskType: number, // Our duration field maps to task_type in the contract
  geofencingEnabled: boolean,
  description: string
) => {
  logBlockchain('Creating task instruction matching Anchor program structure', { 
    wallet: wallet.toString(),
    taskId,
    location,
    areaSize,
    altitude,
    taskType,
    geofencingEnabled,
    description,
    validatorPubkey: validatorPubkey.toString()
  });
  
  try {
    // Find PDA for task account based on the seed in the Rust contract
    // [b"task", task_id.as_bytes()]
    const [taskPDA, bump] = await findTaskPDA(taskId);
    logBlockchain('Task PDA derived', { taskPDA: taskPDA.toString(), bump });

    // Parse location into latitude and longitude (or use fixed test values)
    // Allow switching between test values and form values
    const useTestValues = false; // Switch back to form values
    
    // Parse and validate input parameters
    let inputTaskId = taskId.replace(/[^a-zA-Z0-9-_]/g, ''); // Sanitize task ID
    if (inputTaskId.length < 3) inputTaskId = `task-${Date.now()}`; // Ensure minimum length
    if (inputTaskId.length > 30) inputTaskId = inputTaskId.substring(0, 30); // Limit length
    
    // Parse location coordinates
    let locationLat = 0.0;
    let locationLng = 0.0;
    try {
      const [latStr, lngStr] = location.split(',');
      locationLat = parseFloat(latStr.trim());
      locationLng = parseFloat(lngStr.trim());
      
      // Validate coordinates are in reasonable range
      if (isNaN(locationLat) || locationLat < -90 || locationLat > 90) locationLat = 37.7749;
      if (isNaN(locationLng) || locationLng < -180 || locationLng > 180) locationLng = -122.4194;
    } catch (e) {
      // Default to San Francisco if parsing fails
      locationLat = 37.7749;
      locationLng = -122.4194;
      logError('Failed to parse location coordinates, using defaults', e);
    }
    
    // Validate other numeric inputs
    const validatedAreaSize = isNaN(areaSize) ? 100 : areaSize;
    const validatedTaskType = isNaN(taskType) ? 1 : taskType;
    const validatedAltitude = isNaN(altitude) ? 50 : altitude;
    
    // Validate description
    let validatedDescription = description;
    if (!validatedDescription || validatedDescription.length === 0) {
      validatedDescription = "Drone task";
    }
    if (validatedDescription.length > 200) {
      validatedDescription = validatedDescription.substring(0, 200);
    }
    
    // Test values if needed
    const testTaskId = "test-task-123";
    const testAreaSize = 100;
    const testTaskType = 1;
    const testAltitude = 50;
    const testGeofencing = true;
    const testDescription = "Test drone task for debugging";
    
    // Choose between test values and validated form inputs
    const actualTaskId = useTestValues ? testTaskId : inputTaskId;
    const actualAreaSize = useTestValues ? testAreaSize : validatedAreaSize;
    const actualTaskType = useTestValues ? testTaskType : validatedTaskType;
    const actualAltitude = useTestValues ? testAltitude : validatedAltitude;
    const actualGeofencing = useTestValues ? testGeofencing : geofencingEnabled;
    const actualDescription = useTestValues ? testDescription : validatedDescription;
    
    logBlockchain('Using validated form inputs', {
      taskId: actualTaskId,
      locationLat,
      locationLng,
      areaSize: actualAreaSize,
      taskType: actualTaskType,
      altitude: actualAltitude,
      geofencing: actualGeofencing,
      description: actualDescription.substring(0, 30) + (actualDescription.length > 30 ? '...' : '')
    });
    
    // Ensure numerical values are valid
    const safeTaskType = Math.min(Math.max(0, Math.floor(actualTaskType)), 255); // u8 range
    const safeAltitude = Math.min(Math.max(0, Math.floor(actualAltitude)), 65535); // u16 range
    const safeAreaSize = Math.min(Math.max(0, Math.floor(actualAreaSize)), 4294967295); // u32 range
    
    // Compute instruction discriminator from method name as done in Anchor
    // This should match the 8-byte discriminator generated by Anchor
    // For demonstration, we're using the hardcoded value but normally would compute it
    
    // Serialize all parameters according to Anchor expectations
    // The order must match the Rust handler function parameters
    const taskIdBuf = serializeString(actualTaskId);                   // task_id: String
    const locationLatBuf = serializeF64(locationLat);            // location_lat: f64
    const locationLngBuf = serializeF64(locationLng);            // location_lng: f64
    const areaSizeBuf = serializeU32(safeAreaSize);              // area_size: u32
    const taskTypeBuf = serializeU8(safeTaskType);               // task_type: u8
    const altitudeBuf = serializeU16(safeAltitude);              // altitude: u16
    const geofencingBuf = serializeBool(actualGeofencing);       // geofencing_enabled: bool
    const descriptionBuf = serializeString(actualDescription);    // description: String
    const validatorPubkeyBuf = serializePubkey(validatorPubkey); // validator_pubkey: Pubkey
    
    // Combine all parameters in the exact order of the Rust handler function
    const data = Buffer.concat([
      CREATE_TASK_DISCRIMINATOR,  // Method discriminator (8 bytes)
      taskIdBuf,                 // task_id: String
      locationLatBuf,            // location_lat: f64
      locationLngBuf,            // location_lng: f64
      areaSizeBuf,               // area_size: u32
      taskTypeBuf,               // task_type: u8
      altitudeBuf,               // altitude: u16
      geofencingBuf,             // geofencing_enabled: bool
      descriptionBuf,            // description: String
      validatorPubkeyBuf         // validator_pubkey: Pubkey
    ]);
    
    logBlockchain('Anchor instruction data created', { 
      discriminator: CREATE_TASK_DISCRIMINATOR.toString('hex'),
      dataLength: data.length,
      taskIdLength: taskIdBuf.length,
      locationLat, locationLng,
      taskType: safeTaskType,
      altitude: safeAltitude,
      areaSize: safeAreaSize,
      geofencingEnabled,
      descriptionLength: descriptionBuf.length,
      validator: validatorPubkey.toString()
    });
    
    // Set up the accounts EXACTLY as specified in the CreateTask struct
    const keys = [
      // task account (PDA that will be created)
      { pubkey: taskPDA, isSigner: false, isWritable: true },
      
      // creator (wallet signer)
      { pubkey: wallet, isSigner: true, isWritable: true },
      
      // system_program (required for account creation)
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    
    // Create the instruction
    const instruction = new TransactionInstruction({
      programId,
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
};

export const acceptTaskInstruction = async (
  wallet: PublicKey,
  taskId: string
) => {
  logBlockchain('Accepting task instruction', { 
    wallet: wallet.toString(),
    taskId: taskId
  });
  
  // Find the task PDA
  const [taskPDA, _] = await findTaskPDA(taskId);
  
  // Create the instruction data with just the discriminator
  const data = ACCEPT_TASK_DISCRIMINATOR;
  
  // Required accounts
  const keys = [
    { pubkey: taskPDA, isSigner: false, isWritable: true },
    { pubkey: wallet, isSigner: true, isWritable: true },
  ];
  
  // Create the instruction
  const instruction = new TransactionInstruction({
    programId,
    keys,
    data
  });
  
  logBlockchain('Accept task instruction created', { instruction });
  return instruction;
};

export const completeTaskInstruction = async (
  wallet: PublicKey,
  taskId: string,
  arweaveTxId: string,
  logHash: string,
  signature: string
) => {
  logBlockchain('Completing task instruction', { 
    wallet: wallet.toString(),
    taskId,
    arweaveTxId,
    logHash: logHash.substring(0, 10) + '...', // Truncate for readability
    signature: signature.substring(0, 10) + '...', // Truncate for readability
  });
  
  // Find the task PDA
  const [taskPDA, _] = await findTaskPDA(taskId);
  
  // Convert string hash and signature to byte arrays
  const logHashBytes = Buffer.from(logHash.replace('0x', ''), 'hex');
  const signatureBytes = Buffer.from(signature.replace('0x', ''), 'hex');
  
  // Create instruction data
  const data = Buffer.concat([
    COMPLETE_TASK_DISCRIMINATOR,
    serializeString(arweaveTxId),
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
    programId,
    keys,
    data
  });
  
  logBlockchain('Complete task instruction created', { instruction });
  return instruction;
};

export const recordVerificationInstruction = async (
  wallet: PublicKey,
  taskId: string,
  verificationResult: boolean,
  verificationReportHash: string
) => {
  logBlockchain('Recording verification instruction', { 
    wallet: wallet.toString(),
    taskId,
    verificationResult,
    verificationReportHash
  });
  
  // Find the task PDA
  const [taskPDA, _] = await findTaskPDA(taskId);
  
  // Convert hash to byte array
  const reportHashBytes = Buffer.from(verificationReportHash.replace('0x', ''), 'hex');
  
  // Create instruction data
  const data = Buffer.concat([
    RECORD_VERIFICATION_DISCRIMINATOR,
    serializeString(taskId),
    serializeBool(verificationResult),
    reportHashBytes
  ]);
  
  // Required accounts
  const keys = [
    { pubkey: taskPDA, isSigner: false, isWritable: true },
    { pubkey: wallet, isSigner: true, isWritable: true },
    { pubkey: validatorPubkey, isSigner: true, isWritable: false },
  ];
  
  // Create the instruction
  const instruction = new TransactionInstruction({
    programId,
    keys,
    data
  });
  
  logBlockchain('Verification instruction created', { instruction });
  return instruction;
};
