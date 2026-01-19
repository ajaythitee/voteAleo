// Transaction utility that handles both Leo and Puzzle wallets
// Based on ProvableHQ/zk-auction-example pattern

import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { EventType, requestCreateEvent } from '@puzzlehq/sdk-core';

const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID || 'vote_privacy_2985.aleo';
const NETWORK = WalletAdapterNetwork.TestnetBeta;

// Params for Puzzle Wallet
export interface PuzzleParams {
  type: EventType;
  programId: string;
  functionId: string;
  fee: number; // In credits (e.g., 0.5)
  inputs: string[];
}

// Params for Leo Wallet
export interface LeoParams {
  publicKey: string;
  functionName: string;
  inputs: string[];
  fee: number; // In microcredits (e.g., 500000)
  feePrivate: boolean;
}

export interface TransactionResult {
  success: boolean;
  eventId?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Create and execute a transaction using the appropriate wallet method
 * Based on zk-auction-example pattern from ProvableHQ
 */
export async function createTransaction(
  params: PuzzleParams | LeoParams,
  execute: any,
  walletName: string | undefined
): Promise<TransactionResult> {
  console.log('Creating transaction with wallet:', walletName);
  console.log('Transaction params:', JSON.stringify(params, null, 2));

  try {
    if (walletName === 'Puzzle Wallet') {
      // Create a transaction using the Puzzle Wallet SDK
      console.log('Using Puzzle Wallet SDK...');
      const puzzleParams = params as PuzzleParams;

      // Validate params
      if (!puzzleParams.inputs || puzzleParams.inputs.length === 0) {
        return { success: false, error: 'No inputs provided for transaction' };
      }

      const createEventResponse = await execute(puzzleParams);
      console.log('Puzzle Wallet response:', createEventResponse);

      // Handle the response from the Puzzle Wallet SDK
      if (createEventResponse?.error) {
        console.error('Puzzle Wallet error:', createEventResponse.error);
        return { success: false, error: createEventResponse.error };
      }

      if (createEventResponse?.eventId) {
        console.log('Transaction created successfully:', createEventResponse.eventId);
        return { success: true, eventId: createEventResponse.eventId };
      }

      // Some versions return different response format
      if (createEventResponse?.transactionId) {
        return { success: true, transactionId: createEventResponse.transactionId };
      }

      return { success: true, eventId: 'pending' };
    } else {
      // Create a transaction using the Leo wallet
      console.log('Using Leo Wallet adapter...');
      const leoParams = params as LeoParams;

      // Validate params
      if (!leoParams.publicKey) {
        return { success: false, error: 'No public key provided' };
      }
      if (!leoParams.inputs || leoParams.inputs.length === 0) {
        return { success: false, error: 'No inputs provided for transaction' };
      }

      const transaction = Transaction.createTransaction(
        leoParams.publicKey,
        NETWORK,
        PROGRAM_ID,
        leoParams.functionName,
        leoParams.inputs,
        leoParams.fee,
        leoParams.feePrivate
      );

      console.log('Leo transaction object:', transaction);

      // Call the requestTransaction function on the Leo Wallet
      const txId = await execute(transaction);
      console.log('Leo Wallet response:', txId);

      if (!txId) {
        return { success: false, error: 'Transaction was cancelled or failed' };
      }

      console.log('Transaction created successfully:', txId);
      return { success: true, transactionId: txId };
    }
  } catch (error: any) {
    console.error('Transaction error:', error);

    // Handle specific error cases
    let errorMessage = error.message || 'Transaction failed';

    if (errorMessage.includes('User rejected')) {
      errorMessage = 'Transaction was rejected by user';
    } else if (errorMessage.includes('insufficient')) {
      errorMessage = 'Insufficient balance for transaction fee';
    } else if (errorMessage.includes('not connected')) {
      errorMessage = 'Wallet is not connected';
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Get the program ID
 */
export function getProgramId(): string {
  return PROGRAM_ID;
}

/**
 * Get the network
 */
export function getNetwork(): WalletAdapterNetwork {
  return NETWORK;
}

/**
 * Export EventType for Puzzle wallet
 */
export { EventType, requestCreateEvent };
