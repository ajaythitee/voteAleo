// Wallet Service for Privote
// Works with the Aleo wallet adapter for transactions

import { aleoService } from './aleo';

interface TransactionRequest {
  programId: string;
  functionId: string;
  inputs: string[];
  fee: number;
}

interface TransactionResponse {
  transactionId?: string;
  eventId?: string;
  error?: string;
}

// Transaction helper that works with wallet adapter
// The actual wallet connection is handled by WalletProvider
// This service just formats transaction requests

class WalletService {
  /**
   * Format transaction for create campaign
   */
  formatCreateCampaignTransaction(
    metadataHash: string,
    startTime: number,
    endTime: number,
    optionCount: number
  ): TransactionRequest {
    const inputs = aleoService.formatCreateCampaignInputs(
      metadataHash,
      startTime,
      endTime,
      optionCount
    );

    return {
      programId: aleoService.getProgramId(),
      functionId: 'create_campaign',
      inputs,
      fee: 500000, // 0.5 credits
    };
  }

  /**
   * Format transaction for casting vote
   */
  formatCastVoteTransaction(
    campaignId: number,
    optionIndex: number
  ): TransactionRequest {
    const timestamp = Math.floor(Date.now() / 1000);
    const inputs = aleoService.formatCastVoteInputs(campaignId, optionIndex, timestamp);

    return {
      programId: aleoService.getProgramId(),
      functionId: 'cast_vote',
      inputs,
      fee: 300000, // 0.3 credits
    };
  }

  /**
   * Format transaction for ending campaign
   */
  formatEndCampaignTransaction(campaignId: number): TransactionRequest {
    const inputs = aleoService.formatEndCampaignInputs(campaignId);

    return {
      programId: aleoService.getProgramId(),
      functionId: 'end_campaign',
      inputs,
      fee: 200000, // 0.2 credits
    };
  }

  /**
   * Get program ID
   */
  getProgramId(): string {
    return aleoService.getProgramId();
  }
}

export const walletService = new WalletService();
export type { TransactionRequest, TransactionResponse };
