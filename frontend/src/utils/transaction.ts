// Transaction utility that handles both Leo and Puzzle wallets
// Based on ProvableHQ/zk-auction-example pattern

import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { EventType, requestCreateEvent } from '@puzzlehq/sdk-core';

const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;
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
  walletName: string | undefined,
  programIdOverride?: string
): Promise<TransactionResult> {
  const programId = programIdOverride || PROGRAM_ID;
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
        programId,
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
 * Build params for create_campaign transition (Puzzle or Leo based on walletName).
 */
export function buildCreateCampaignParams(
  inputs: string[],
  address: string,
  walletName: string | undefined
): PuzzleParams | LeoParams {
  if (walletName === 'Puzzle Wallet') {
    return {
      type: EventType.Execute,
      programId: PROGRAM_ID,
      functionId: 'create_campaign',
      fee: 0.5,
      inputs,
    };
  }
  return {
    publicKey: address,
    functionName: 'create_campaign',
    inputs,
    fee: 500000,
    feePrivate: false,
  };
}

/**
 * Build params for cast_vote transition (Puzzle or Leo based on walletName).
 */
export function buildVoteParams(
  inputs: string[],
  address: string,
  walletName: string | undefined
): PuzzleParams | LeoParams {
  if (walletName === 'Puzzle Wallet') {
    return {
      type: EventType.Execute,
      programId: PROGRAM_ID,
      functionId: 'cast_vote',
      fee: 0.3,
      inputs,
    };
  }
  return {
    publicKey: address,
    functionName: 'cast_vote',
    inputs,
    fee: 300000,
    feePrivate: false,
  };
}

/**
 * Get the voting program ID
 */
export function getProgramId(): string {
  return PROGRAM_ID;
}

/**
 * Get the auction program ID
 */
export function getAuctionProgramId(): string {
  return AUCTION_PROGRAM_ID;
}

/**
 * Build params for create_public_auction (Puzzle or Leo).
 * inputs: [auction_name, bid_types_accepted, item_id, item_offchain_data[0..3], starting_bid, nonce, reveal_address]
 */
export function buildCreatePublicAuctionParams(
  inputs: string[],
  address: string,
  walletName: string | undefined
): PuzzleParams | LeoParams {
  if (walletName === 'Puzzle Wallet') {
    return {
      type: EventType.Execute,
      programId: AUCTION_PROGRAM_ID,
      functionId: 'create_public_auction',
      fee: 0.5,
      inputs,
    };
  }
  return {
    publicKey: address,
    functionName: 'create_public_auction',
    inputs,
    fee: 500000,
    feePrivate: false,
  };
}

/**
 * Build params for bid_public (Puzzle or Leo).
 * inputs: [amount, auction_id, nonce, publish_bidder_address]
 */
export function buildBidPublicParams(
  inputs: string[],
  address: string,
  walletName: string | undefined
): PuzzleParams | LeoParams {
  if (walletName === 'Puzzle Wallet') {
    return {
      type: EventType.Execute,
      programId: AUCTION_PROGRAM_ID,
      functionId: 'bid_public',
      fee: 0.3,
      inputs,
    };
  }
  return {
    publicKey: address,
    functionName: 'bid_public',
    inputs,
    fee: 300000,
    feePrivate: false,
  };
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
