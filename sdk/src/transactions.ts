import type { TransactionParams } from './types.js';

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

function env(key: string): string {
  return (typeof process !== 'undefined' && process?.env?.[key]) || '';
}

const VOTING_PROGRAM_ID = env('NEXT_PUBLIC_VOTING_PROGRAM_ID') || env('VOTING_PROGRAM_ID');
const AUCTION_PROGRAM_ID = env('NEXT_PUBLIC_AUCTION_PROGRAM_ID') || env('AUCTION_PROGRAM_ID');

export function buildCreateCampaignParams(inputs: string[]): TransactionParams {
  return { programId: VOTING_PROGRAM_ID, functionId: 'create_campaign', inputs, fee: 400000, privateFee: false };
}

export function buildVoteParams(inputs: string[]): TransactionParams {
  return { programId: VOTING_PROGRAM_ID, functionId: 'vote', inputs, fee: 300000, privateFee: false };
}

export function buildCreatePublicAuctionParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'create_auction', inputs, fee: 700000, privateFee: false };
}

export function buildCreateAuctionWithDurationParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'create_auction_with_duration', inputs, fee: 700000, privateFee: false };
}

export function buildCreateDutchAuctionParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'create_dutch_auction', inputs, fee: 700000, privateFee: false };
}

export function buildPlaceBidParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'place_bid', inputs, fee: 300000, privateFee: false };
}

export function buildBidDutchAleoParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'bid_dutch', inputs, fee: 500000, privateFee: false };
}

export function buildBidDutchUsdcxParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'bid_dutch_usdcx', inputs, fee: 500000, privateFee: false };
}

export function buildBidEnglishAleoParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'bid_english', inputs, fee: 500000, privateFee: false };
}

export function buildBidEnglishUsdcxParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'bid_english_usdcx', inputs, fee: 500000, privateFee: false };
}

export function buildRevealBidAleoParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'reveal_bid', inputs, fee: 500000, privateFee: false };
}

export function buildRevealBidUsdcxParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'reveal_bid_usdcx', inputs, fee: 500000, privateFee: false };
}

export function buildRevealBidUsadParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'reveal_bid_usad', inputs, fee: 500000, privateFee: false };
}

export function buildCloseBiddingParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'close_bidding', inputs, fee: 250000, privateFee: false };
}

export function buildFinalizeAuctionParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'finalize_auction', inputs, fee: 400000, privateFee: false };
}

export function buildCancelAuctionParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'cancel_auction', inputs, fee: 250000, privateFee: false };
}

export function buildSettleEnglishParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'settle_english', inputs, fee: 400000, privateFee: false };
}

export function buildClaimWinAleoParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_win', inputs, fee: 500000, privateFee: false };
}

export function buildClaimWinUsdcxParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_win_usdcx', inputs, fee: 500000, privateFee: false };
}

export function buildClaimWinUsadParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_win_usad', inputs, fee: 500000, privateFee: false };
}

export function buildClaimWinVickreyAleoParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_win_vickrey', inputs, fee: 600000, privateFee: false };
}

export function buildClaimWinVickreyUsdcxParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_win_vickrey_usdcx', inputs, fee: 600000, privateFee: false };
}

export function buildClaimRefundAleoParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_refund', inputs, fee: 300000, privateFee: false };
}

export function buildClaimRefundUsdcxParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_refund_usdcx', inputs, fee: 300000, privateFee: false };
}

export function buildClaimRefundUsadParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'claim_refund_usad', inputs, fee: 300000, privateFee: false };
}

export function buildDisputeAuctionParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'dispute_auction', inputs, fee: 600000, privateFee: false };
}

export function buildResolveDisputeParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'resolve_dispute', inputs, fee: 400000, privateFee: false };
}

export function buildProveWonAuctionParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'prove_won_auction', inputs, fee: 150000, privateFee: false };
}

export function buildBidPublicParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'bid_public', inputs, fee: 300000, privateFee: false };
}

export function buildBidPrivateParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'bid_private', inputs, fee: 300000, privateFee: false };
}

export function buildSelectWinnerParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'select_winner_public', inputs, fee: 500000, privateFee: false };
}

export function buildSelectWinnerPrivateParams(inputs: string[] = []): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'select_winner_private', inputs, fee: 500000, privateFee: false };
}

export function buildRedeemBidPublicParams(inputs: string[]): TransactionParams {
  return { programId: AUCTION_PROGRAM_ID, functionId: 'redeem_bid_public', inputs, fee: 300000, privateFee: false };
}
