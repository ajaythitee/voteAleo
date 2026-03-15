import type { TransactionOptions } from '@provablehq/aleo-types';

const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;

export interface TransactionParams {
  programId: string;
  functionId: string;
  inputs: string[];
  fee: number;
  recordIndices?: number[];
  privateFee?: boolean;
}

export interface TransactionResult {
  success: boolean;
  eventId?: string;
  transactionId?: string;
  error?: string;
}

export async function createTransaction(
  params: TransactionParams,
  executeTransaction: (options: TransactionOptions) => Promise<{ transactionId: string } | undefined>,
  walletName?: string
): Promise<TransactionResult> {
  const programId = params.programId;

  console.log('Creating transaction with wallet:', walletName);
  console.log('Transaction params:', JSON.stringify(params, null, 2));

  try {
    const txRequest: TransactionOptions = {
      program: programId,
      function: params.functionId,
      inputs: params.inputs ?? [],
      fee: params.fee,
      recordIndices: params.recordIndices,
      privateFee: params.privateFee,
    };
    const response = await executeTransaction(txRequest);

    console.log('Wallet response:', response);

    const txId = response?.transactionId || (typeof response === 'string' ? response : undefined);

    if (!txId) {
      return { success: true };
    }

    if (typeof txId === 'string' && (txId.includes('rejected') || txId.includes('error') || txId.includes('failed'))) {
      return { success: false, error: `Transaction was rejected: ${txId}` };
    }

    console.log('Transaction created successfully:', txId);
    return { success: true, transactionId: txId };
  } catch (error: any) {
    console.error('Transaction error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error,
    });

    // Handle specific error cases
    let errorMessage = error.message || 'Transaction failed';

    if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
      errorMessage =
        'Transaction was rejected. This could be due to insufficient balance, network issues, or contract validation failure.';
    } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      errorMessage = 'Insufficient balance for transaction fee. Please ensure you have enough credits.';
    } else if (errorMessage.includes('not connected') || errorMessage.includes('disconnected')) {
      errorMessage = 'Wallet is not connected. Please reconnect your wallet.';
    } else if (errorMessage.includes('assert') || errorMessage.includes('assertion')) {
      errorMessage =
        'Transaction validation failed. This could mean the campaign is inactive, you already voted, or the option index is invalid.';
    } else if (errorMessage.includes('record')) {
      errorMessage = 'Your wallet could not find the required Aleo record for this action. Make sure the correct wallet is connected and try again.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      errorMessage = 'Network timeout. Please check your connection and try again.';
    } else if (errorMessage.includes('is not a function')) {
      errorMessage = 'This wallet action is not available in the current session. Reconnect your wallet and try again.';
    }

    return { success: false, error: errorMessage };
  }
}

export function buildCreateCampaignParams(inputs: string[]): TransactionParams {
  return {
    programId: PROGRAM_ID,
    functionId: 'create_campaign',
    inputs,
    fee: 500000,
  };
}

export function buildVoteParams(inputs: string[]): TransactionParams {
  return {
    programId: PROGRAM_ID,
    functionId: 'cast_vote',
    inputs,
    fee: 300000,
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
 * Build params for create_public_auction.
 * inputs: [auction_name, bid_types_accepted, item_id, item_offchain_data[0..3], starting_bid, nonce, reveal_address]
 */
export function buildCreatePublicAuctionParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'create_public_auction',
    inputs,
    fee: 500000,
  };
}

/**
 * Build params for bid_public.
 * inputs: [amount, auction_id, nonce, publish_bidder_address]
 */
export function buildBidPublicParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_public',
    inputs,
    fee: 300000,
  };
}

export function buildBidPrivateParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_private',
    inputs,
    fee: 300000,
  };
}

/**
 * Build params for select_winner_public.
 * inputs: [winning_bid_struct, winning_bid_id]
 * AuctionTicket is a record, so the wallet can prompt for it.
 */
export function buildSelectWinnerParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'select_winner_public',
    inputs,
    fee: 500000,
  };
}

export function buildSelectWinnerPrivateParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'select_winner_private',
    inputs,
    fee: 500000,
  };
}

export function buildRedeemBidPublicParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'redeem_bid_public',
    inputs,
    fee: 300000,
  };
}


