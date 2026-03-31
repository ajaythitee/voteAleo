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

export interface TransactionStatusCheckResult {
  status: string;
  error?: string;
  transactionId?: string;
}

export function isTemporaryWalletTransactionId(transactionId: string | undefined): boolean {
  if (!transactionId) return false;
  const normalized = transactionId.toLowerCase();
  return normalized.startsWith('shield_') || normalized.startsWith('leo_') || normalized.startsWith('puzzle_');
}

function canRecoverWalletConnection(errorMessage: string): boolean {
  return (
    errorMessage.includes('Receiving end does not exist') ||
    errorMessage.includes('Could not establish connection') ||
    errorMessage.includes('Wallet not connected') ||
    errorMessage.includes('No response')
  );
}

export async function createTransaction(
  params: TransactionParams,
  executeTransaction: (options: TransactionOptions) => Promise<{ transactionId: string } | undefined>,
  walletName?: string,
  options?: {
    recoverConnection?: () => Promise<unknown>;
  }
): Promise<TransactionResult> {
  const programId = params.programId;

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

    const txId = response?.transactionId || (typeof response === 'string' ? response : undefined);

    if (!txId) {
      return {
        success: false,
        error: 'The wallet did not return a transaction ID, so the transaction was not broadcast.',
      };
    }

    if (typeof txId === 'string' && (txId.includes('rejected') || txId.includes('error') || txId.includes('failed'))) {
      return { success: false, error: `Transaction was rejected: ${txId}` };
    }

    return { success: true, transactionId: txId };
  } catch (error: any) {
    // Handle specific error cases
    let errorMessage = error.message || 'Transaction failed';

    if (options?.recoverConnection && canRecoverWalletConnection(errorMessage)) {
      try {
        await options.recoverConnection();
        await new Promise((resolve) => setTimeout(resolve, 800));

        const retryResponse = await executeTransaction({
          program: params.programId,
          function: params.functionId,
          inputs: params.inputs ?? [],
          fee: params.fee,
          recordIndices: params.recordIndices,
          privateFee: params.privateFee,
        });

        const retryTxId =
          retryResponse?.transactionId ||
          (typeof retryResponse === 'string' ? retryResponse : undefined);

        if (retryTxId) {
          return { success: true, transactionId: retryTxId };
        }

        return {
          success: false,
          error: 'The wallet reconnected but did not return a transaction ID for the submitted request.',
        };
      } catch (recoveryError: any) {
        errorMessage = recoveryError?.message || errorMessage;
      }
    }

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
    } else if (
      errorMessage.includes('Receiving end does not exist') ||
      errorMessage.includes('Could not establish connection') ||
      errorMessage.includes('No response')
    ) {
      errorMessage =
        'The wallet did not answer the transaction request. Re-open Shield, make sure the extension is unlocked, and try again.';
    }

    return { success: false, error: errorMessage };
  }
}

export async function awaitTransactionConfirmation(
  transactionId: string | undefined,
  checkStatus: (transactionId: string) => Promise<TransactionStatusCheckResult | null>,
  opts?: { attempts?: number; delayMs?: number }
): Promise<{ confirmed: boolean; status: string; error?: string; transactionId?: string }> {
  if (!transactionId) {
    return { confirmed: false, status: 'submitted' };
  }

  const attempts = opts?.attempts ?? 6;
  const delayMs = opts?.delayMs ?? 2500;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await checkStatus(transactionId);
    const status = result?.status?.toLowerCase() ?? 'pending';

    if (status === 'accepted' || status === 'confirmed' || status === 'completed' || status === 'success') {
      return { confirmed: true, status, transactionId: result?.transactionId ?? transactionId };
    }

    if (status === 'rejected' || status === 'failed' || status === 'aborted') {
      return { confirmed: false, status, error: result?.error, transactionId: result?.transactionId ?? transactionId };
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { confirmed: false, status: 'pending', transactionId };
}

export function buildCreateCampaignParams(inputs: string[]): TransactionParams {
  return {
    programId: PROGRAM_ID,
    functionId: 'create_campaign',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildVoteParams(inputs: string[]): TransactionParams {
  return {
    programId: PROGRAM_ID,
    functionId: 'cast_vote',
    inputs,
    fee: 300000,
    privateFee: false,
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
    privateFee: false,
  };
}

export function buildCreateAuctionWithDurationParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'create_auction_with_duration',
    inputs,
    fee: 700000,
    privateFee: false,
  };
}

export function buildCreateDutchAuctionParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'create_dutch_auction',
    inputs,
    fee: 700000,
    privateFee: false,
  };
}

export function buildPlaceBidParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'place_bid',
    inputs,
    fee: 300000,
    privateFee: false,
  };
}

export function buildBidDutchAleoParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_dutch',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildBidDutchUsdcxParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_dutch_usdcx',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildBidEnglishAleoParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_english',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildBidEnglishUsdcxParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_english_usdcx',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildRevealBidAleoParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'reveal_bid',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildRevealBidUsdcxParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'reveal_bid_usdcx',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildRevealBidUsadParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'reveal_bid_usad',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildCloseBiddingParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'close_bidding',
    inputs,
    fee: 250000,
    privateFee: false,
  };
}

export function buildFinalizeAuctionParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'finalize_auction',
    inputs,
    fee: 400000,
    privateFee: false,
  };
}

export function buildCancelAuctionParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'cancel_auction',
    inputs,
    fee: 250000,
    privateFee: false,
  };
}

export function buildSettleEnglishParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'settle_english',
    inputs,
    fee: 400000,
    privateFee: false,
  };
}

export function buildClaimWinAleoParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_win',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildClaimWinUsdcxParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_win_usdcx',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildClaimWinUsadParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_win_usad',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildClaimWinVickreyAleoParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_win_vickrey',
    inputs,
    fee: 600000,
    privateFee: false,
  };
}

export function buildClaimWinVickreyUsdcxParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_win_vickrey_usdcx',
    inputs,
    fee: 600000,
    privateFee: false,
  };
}

export function buildClaimRefundAleoParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_refund',
    inputs,
    fee: 300000,
    privateFee: false,
  };
}

export function buildClaimRefundUsdcxParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_refund_usdcx',
    inputs,
    fee: 300000,
    privateFee: false,
  };
}

export function buildClaimRefundUsadParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'claim_refund_usad',
    inputs,
    fee: 300000,
    privateFee: false,
  };
}

export function buildDisputeAuctionParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'dispute_auction',
    inputs,
    fee: 600000,
    privateFee: false,
  };
}

export function buildResolveDisputeParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'resolve_dispute',
    inputs,
    fee: 400000,
    privateFee: false,
  };
}

export function buildProveWonAuctionParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'prove_won_auction',
    inputs,
    fee: 150000,
    privateFee: false,
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
    privateFee: false,
  };
}

export function buildBidPrivateParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'bid_private',
    inputs,
    fee: 300000,
    privateFee: false,
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
    privateFee: false,
  };
}

export function buildSelectWinnerPrivateParams(inputs: string[] = []): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'select_winner_private',
    inputs,
    fee: 500000,
    privateFee: false,
  };
}

export function buildRedeemBidPublicParams(inputs: string[]): TransactionParams {
  return {
    programId: AUCTION_PROGRAM_ID,
    functionId: 'redeem_bid_public',
    inputs,
    fee: 300000,
    privateFee: false,
  };
}

