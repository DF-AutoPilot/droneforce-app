/* eslint-disable @typescript-eslint/no-explicit-any */
import { Program, AnchorProvider, web3, BN, Idl } from '@project-serum/anchor';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createApproveInstruction, 
  getAssociatedTokenAddress 
} from '@solana/spl-token';
import { logBlockchain, logInfo, logError } from './logger';
import rawEscrowIdl from '../../drone_service_escrow.json';
import { connection } from './anchor-client';

// The Solana escrow program ID
export const escrowProgramId = new PublicKey(
  process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID || 
  'DupsqrqSRGsHJ4sq6XRzsRMoaCGHL71S9f3ngEGEmonN' // Default to your Escrow Contract ID
);

// Properly format the escrow IDL for Anchor
const formattedEscrowIdl: Idl = {
  version: '0.1.0',
  name: 'drone_service_escrow',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        {
          name: 'client',
          isMut: true,
          isSigner: true
        },
        {
          name: 'paymentMint',
          isMut: false,
          isSigner: false
        },
        {
          name: 'clientPaymentToken',
          isMut: true,
          isSigner: false
        },
        {
          name: 'escrow',
          isMut: true,
          isSigner: false
        },
        {
          name: 'escrowedPaymentTokens',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'paymentAmount',
          type: 'u64'
        },
        {
          name: 'serviceType',
          type: 'string'
        },
        {
          name: 'nonce',
          type: 'string'
        }
      ]
    },
    {
      name: 'accept',
      accounts: [
        {
          name: 'operator',
          isMut: false,
          isSigner: true
        },
        {
          name: 'escrow',
          isMut: true,
          isSigner: false
        },
        {
          name: 'client',
          isMut: true,
          isSigner: false
        },
        {
          name: 'escrowedPaymentTokens',
          isMut: true,
          isSigner: false
        },
        {
          name: 'operatorPaymentToken',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: 'cancel',
      accounts: [
        {
          name: 'client',
          isMut: false,
          isSigner: true
        },
        {
          name: 'escrow',
          isMut: true,
          isSigner: false
        },
        {
          name: 'escrowedPaymentTokens',
          isMut: true,
          isSigner: false
        },
        {
          name: 'clientPaymentToken',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: 'Escrow',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bump',
            type: 'u8'
          },
          {
            name: 'client',
            type: 'publicKey'
          },
          {
            name: 'escrowedPaymentTokens',
            type: 'publicKey'
          },
          {
            name: 'serviceType',
            type: 'string'
          },
          {
            name: 'nonce',
            type: 'string'
          }
        ]
      }
    }
  ]
};

// Function to derive PDA for escrow account
export const findEscrowPDA = async (
  client: PublicKey, 
  nonce: string
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from('escrow'),
      client.toBuffer(),
      Buffer.from(nonce)
    ],
    escrowProgramId
  );
};

// Function to derive PDA for escrowed tokens account
export const findEscrowedTokensPDA = async (
  client: PublicKey, 
  nonce: string
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      Buffer.from('escrowed_tokens'),
      client.toBuffer(),
      Buffer.from(nonce)
    ],
    escrowProgramId
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
  return new Program(formattedEscrowIdl, escrowProgramId, provider);
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

// Initialize escrow instruction
export const initializeEscrowInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  paymentMint: PublicKey,
  paymentAmount: number,
  serviceType: string,
  nonce: string // same as taskId for integration
) => {
  try {
    logBlockchain('Initializing escrow using Anchor IDL', {
      wallet: wallet.toString(),
      paymentMint: paymentMint.toString(),
      paymentAmount,
      nonce
    });

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the client token account
    const clientTokenAccount = await getAssociatedTokenAddress(
      paymentMint,
      wallet,
      false // allowOwnerOffCurve = false for a typical wallet
    );
    
    // Check if the client token account exists
    let clientTokenAccountInfo;
    try {
      clientTokenAccountInfo = await connection.getAccountInfo(clientTokenAccount);
    } catch (error) {
      logError('Error checking token account', error);
    }
    
    // If using native SOL (Wrapped SOL), handle special case
    const WSOL_ADDRESS = 'So11111111111111111111111111111111111111112';
    const isWSOL = paymentMint.toString() === WSOL_ADDRESS;
    
    // Use the correct mint address for WSOL
    const actualMint = isWSOL ? new PublicKey(WSOL_ADDRESS) : paymentMint;
    
    // Create associated token account if it doesn't exist
    const instructions: web3.TransactionInstruction[] = [];
    
    if (!clientTokenAccountInfo) {
      logInfo('Token account does not exist, creating it...', {
        account: clientTokenAccount.toString(),
        mint: actualMint.toString(),
        isWSOL
      });
      
      // Create ATA without dynamic import
      // Use the ASSOCIATED_TOKEN_PROGRAM_ID constant instead
      const { ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      
      // Standard create ATA instruction
      instructions.push(
        new web3.TransactionInstruction({
          keys: [
            { pubkey: wallet, isSigner: true, isWritable: true }, // payer
            { pubkey: clientTokenAccount, isSigner: false, isWritable: true }, // ata
            { pubkey: wallet, isSigner: false, isWritable: false }, // owner
            { pubkey: actualMint, isSigner: false, isWritable: false }, // mint
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
            { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
          ],
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          data: Buffer.from([]),
        })
      );
    }
    
    // For WSOL, we need to wrap SOL first
    if (isWSOL) {
      // If the account already exists, we just need to fund it and sync
      // If it doesn't exist, we created the ATA above and now need to fund it
      
      try {
        // Add SOL to the wrapped SOL account - exactly the amount specified
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: wallet,
            toPubkey: clientTokenAccount,
            lamports: paymentAmount, // Exact amount requested
          })
        );
        
        // Import WSOL specific instruction
        const { createSyncNativeInstruction } = await import('@solana/spl-token');
        
        // Sync native instruction for wrapped SOL
        // This converts the native SOL to wrapped SOL token
        instructions.push(createSyncNativeInstruction(clientTokenAccount));
        
        logInfo('Added WSOL conversion instructions', {
          account: clientTokenAccount.toString(),
          lamports: paymentAmount
        });
      } catch (error) {
        logError('Error creating WSOL instructions', error);
      }
    }

    // Find the PDA for the escrow account
    const [escrowAccount, escrowBump] = await findEscrowPDA(wallet, nonce);
    
    // Find the PDA for the escrowed tokens account
    const [escrowedTokens, tokenBump] = await findEscrowedTokensPDA(wallet, nonce);
    
    // Create approve instruction for the payment amount
    // This should now work since we've ensured the token account exists
    const approveIx = createApproveInstruction(
      clientTokenAccount,
      escrowedTokens,
      wallet,
      BigInt(paymentAmount)
    );

    // Prepare the transaction for initialize escrow
    const initEscrowIx = await program.methods
      .initialize(
        new BN(paymentAmount),
        serviceType,
        nonce
      )
      .accounts({
        client: wallet,
        paymentMint: paymentMint,
        clientPaymentToken: clientTokenAccount,
        escrow: escrowAccount,
        escrowedPaymentTokens: escrowedTokens,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    
    // Create a new transaction
    const tx = new Transaction();
    
    // Add our token account setup instructions first
    if (instructions.length > 0) {
      tx.add(...instructions);
    }
    
    // Then add the approve and init escrow instructions
    tx.add(approveIx)
      .add(initEscrowIx);
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created escrow initialization transaction', {
      escrowAccount: escrowAccount.toString(),
      escrowedTokens: escrowedTokens.toString(),
      tx: tx.instructions.length,
      setupInstructions: instructions.length,
      isWSOL: isWSOL
    });
    
    return {
      transaction: tx,
      escrowAccount,
      escrowedTokens
    };
  } catch (error) {
    logError('Error initializing escrow', error);
    throw error;
  }
};

// Accept escrow payment instruction (called after task verification)
export const acceptEscrowInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  clientAddress: PublicKey,
  nonce: string, // same as taskId
  paymentMint: PublicKey
) => {
  try {
    logBlockchain('Accepting escrow payment using Anchor IDL', {
      operator: wallet.toString(),
      client: clientAddress.toString(),
      nonce
    });

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the PDA for the escrow account
    const [escrowAccount] = await findEscrowPDA(clientAddress, nonce);
    
    // Find the PDA for the escrowed tokens account
    const [escrowedTokens] = await findEscrowedTokensPDA(clientAddress, nonce);
    
    // Find the operator token account
    const operatorTokenAccount = await getAssociatedTokenAddress(
      paymentMint,
      wallet,
      false
    );
    
    // Check if the operator token account exists
    let operatorTokenAccountInfo = null;
    try {
      operatorTokenAccountInfo = await connection.getAccountInfo(operatorTokenAccount);
    } catch (error) {
      logInfo('Error checking operator token account', error);
    }
    
    // Initialize array for setup instructions
    const instructions: web3.TransactionInstruction[] = [];
    
    // If the token account doesn't exist, create it
    if (!operatorTokenAccountInfo) {
      logInfo('Operator token account does not exist, creating it...', {
        account: operatorTokenAccount.toString(),
        mint: paymentMint.toString()
      });
      
      // Use the ASSOCIATED_TOKEN_PROGRAM_ID
      const { ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      
      // Add instruction to create the associated token account
      instructions.push(
        new web3.TransactionInstruction({
          keys: [
            { pubkey: wallet, isSigner: true, isWritable: true }, // payer
            { pubkey: operatorTokenAccount, isSigner: false, isWritable: true }, // ata
            { pubkey: wallet, isSigner: false, isWritable: false }, // owner
            { pubkey: paymentMint, isSigner: false, isWritable: false }, // mint
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
            { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
          ],
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          data: Buffer.from([]),
        })
      );
    }
    
    // Prepare the transaction for accept escrow
    const acceptIx = await program.methods
      .accept()
      .accounts({
        operator: wallet,
        escrow: escrowAccount,
        client: clientAddress,
        escrowedPaymentTokens: escrowedTokens,
        operatorPaymentToken: operatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    
    // Create transaction and add all instructions
    const tx = new web3.Transaction();
    
    // Add token account creation instruction if needed
    if (instructions.length > 0) {
      tx.add(...instructions);
    }
    
    // Add the accept escrow instruction
    tx.add(acceptIx);
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created accept escrow transaction', {
      escrowAccount: escrowAccount.toString(),
      operatorTokenAccount: operatorTokenAccount.toString(),
      tx: tx.instructions.length,
    });
    
    return tx;
  } catch (error) {
    logError('Error accepting escrow payment', error);
    throw error;
  }
};

// Cancel escrow instruction
export const cancelEscrowInstruction = async (
  wallet: PublicKey,
  signTransaction: any,
  signAllTransactions: any,
  nonce: string, // same as taskId
  paymentMint: PublicKey
) => {
  try {
    logBlockchain('Cancelling escrow using Anchor IDL', {
      client: wallet.toString(),
      nonce
    });

    // Create wallet adapter from pubkey and signing functions
    const walletAdapter = createWalletAdapter(wallet, signTransaction, signAllTransactions);
    
    // Create provider and program
    const provider = createAnchorProvider(walletAdapter);
    const program = createProgram(provider);
    
    // Find the PDA for the escrow account
    const [escrowAccount] = await findEscrowPDA(wallet, nonce);
    
    // Find the PDA for the escrowed tokens account
    const [escrowedTokens] = await findEscrowedTokensPDA(wallet, nonce);
    
    // Find the client token account
    const clientTokenAccount = await getAssociatedTokenAddress(
      paymentMint,
      wallet,
      false
    );
    
    // Prepare the transaction for cancel escrow
    const tx = await program.methods
      .cancel()
      .accounts({
        client: wallet,
        escrow: escrowAccount,
        escrowedPaymentTokens: escrowedTokens,
        clientPaymentToken: clientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
    
    // Return the transaction for the wallet to sign & send
    logBlockchain('Created cancel escrow transaction', {
      escrowAccount: escrowAccount.toString(),
      clientTokenAccount: clientTokenAccount.toString(),
      tx: tx.instructions.length,
    });
    
    return tx;
  } catch (error) {
    logError('Error cancelling escrow', error);
    throw error;
  }
};
