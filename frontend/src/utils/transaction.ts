// Transaction utility that handles both Leo and Puzzle wallets
// Based on ProvableHQ/zk-auction-example pattern

import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { EventType, requestCreateEvent } from '@puzzlehq/sdk-core';

const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID || 'vote_privacy_2985.aleo';

// Params for Puzzle Wallet
interface PuzzleParams {
  type: typeof EventType.Execute;
  programId: string;
  functionId: string;
  fee: number; // In credits (e.g., 0.5)
  inputs: string[];
}

// Params for Leo Wallet
interface LeoParams {
  publicKey: string;
  functionName: string;
  inputs: string[];
  fee: number; // In microcredits (e.g., 500000)
  feePrivate: boolean;
}

/**
 * Create and execute a transaction using the appropriate wallet method
 * Based on zk-auction-example pattern from ProvableHQ
 */
export async function createTransaction(
  params: PuzzleParams | LeoParams,
  execute: any,
  walletName: string | undefined
): Promise<{ success: boolean; eventId?: string; transactionId?: string; error?: string }> {
  console.log('Creating transaction with', walletName, 'with params:', params);

  try {
    if (walletName === 'Puzzle Wallet') {
      // Create a transaction using the Puzzle Wallet SDK
      const createEventResponse = await execute(params);

      // Handle the response from the Puzzle Wallet SDK
      if (createEventResponse.error) {
        console.log(`Error creating event: ${createEventResponse.error}`);
        return { success: false, error: createEventResponse.error };
      } else {
        console.log(`Transaction created successfully: ${createEventResponse.eventId}`);
        return { success: true, eventId: createEventResponse.eventId };
      }
    } else {
      // Create a transaction using the Leo wallet
      const leoParams = params as LeoParams;
      const transaction = Transaction.createTransaction(
        leoParams.publicKey,
        WalletAdapterNetwork.TestnetBeta,
        PROGRAM_ID,
        leoParams.functionName,
        leoParams.inputs,
        leoParams.fee,
        leoParams.feePrivate
      );

      console.log('Leo transaction:', transaction);

      // Call the requestTransaction function on the Leo Wallet
      const txId = await execute(transaction);

      if (!txId) {
        return { success: false, error: 'Transaction was cancelled or failed' };
      }

      console.log(`Transaction created successfully: ${txId}`);
      return { success: true, transactionId: txId };
    }
  } catch (error: any) {
    console.error('Transaction error:', error);
    return { success: false, error: error.message || 'Transaction failed' };
  }
}

/**
 * Get the program ID
 */
export function getProgramId(): string {
  return PROGRAM_ID;
}

/**
 * Export EventType for Puzzle wallet
 */
export { EventType, requestCreateEvent };
