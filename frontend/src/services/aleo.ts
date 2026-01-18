// Aleo Service for VoteAleo contract interactions

import { AleoConfig, Campaign, VotingOption } from '@/types';

const config: AleoConfig = {
  network: (process.env.NEXT_PUBLIC_ALEO_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1',
  votingProgramId: process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID || 'vote_privacy_2985.aleo',
};

class AleoService {
  private config: AleoConfig;

  constructor() {
    this.config = config;
  }

  /**
   * Get the voting program ID
   */
  getProgramId(): string {
    return this.config.votingProgramId;
  }

  /**
   * Get network configuration
   */
  getNetwork(): string {
    return this.config.network;
  }

  /**
   * Get RPC URL
   */
  getRpcUrl(): string {
    return this.config.rpcUrl;
  }

  /**
   * Hash a string to field element (simulated - actual hashing done on-chain)
   */
  hashToField(input: string): string {
    // In production, this would use proper Aleo hashing
    // For now, we return a deterministic placeholder
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${Math.abs(hash)}field`;
  }

  /**
   * Format inputs for create_campaign transition
   * New contract uses metadata_hash (IPFS CID containing all campaign data)
   */
  formatCreateCampaignInputs(
    metadataHash: string,
    startTime: number,
    endTime: number,
    optionCount: number
  ): string[] {
    return [
      metadataHash,
      `${startTime}u64`,
      `${endTime}u64`,
      `${optionCount}u8`,
    ];
  }

  /**
   * Format inputs for cast_vote transition
   */
  formatCastVoteInputs(
    campaignId: number,
    optionIndex: number,
    timestamp: number
  ): string[] {
    return [
      `${campaignId}u64`,
      `${optionIndex}u8`,
      `${timestamp}u64`,
    ];
  }

  /**
   * Format inputs for end_campaign transition
   */
  formatEndCampaignInputs(campaignId: number): string[] {
    return [`${campaignId}u64`];
  }

  /**
   * Fetch campaign data from chain (via RPC)
   */
  async fetchCampaign(campaignId: number): Promise<Campaign | null> {
    try {
      const response = await fetch(
        `${this.config.rpcUrl}/${this.config.network}/program/${this.config.votingProgramId}/mapping/campaigns/${campaignId}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      // Parse the on-chain data into Campaign format
      // This would need proper parsing based on actual contract output
      return data;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  /**
   * Fetch vote count for an option
   */
  async fetchVoteCount(campaignId: number, optionIndex: number): Promise<number> {
    try {
      // Calculate the vote key hash (same as in contract)
      const voteKey = this.hashToField(`${campaignId}${optionIndex}`);

      const response = await fetch(
        `${this.config.rpcUrl}/${this.config.network}/program/${this.config.votingProgramId}/mapping/campaign_votes/${voteKey}`
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return parseInt(data) || 0;
    } catch (error) {
      console.error('Error fetching vote count:', error);
      return 0;
    }
  }

  /**
   * Check if an address has voted
   */
  async hasVoted(campaignId: number, addressHash: string): Promise<boolean> {
    try {
      const votedKey = this.hashToField(`${campaignId}${addressHash}`);

      const response = await fetch(
        `${this.config.rpcUrl}/${this.config.network}/program/${this.config.votingProgramId}/mapping/has_voted/${votedKey}`
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data === 'true';
    } catch (error) {
      console.error('Error checking vote status:', error);
      return false;
    }
  }

  /**
   * Get the current campaign counter
   */
  async getCampaignCount(): Promise<number> {
    try {
      const response = await fetch(
        `${this.config.rpcUrl}/${this.config.network}/program/${this.config.votingProgramId}/mapping/campaign_counter/0u8`
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return parseInt(data) || 0;
    } catch (error) {
      console.error('Error fetching campaign count:', error);
      return 0;
    }
  }

  /**
   * Get explorer URL for a transaction
   */
  getExplorerUrl(transactionId: string): string {
    const baseUrl = this.config.network === 'mainnet'
      ? 'https://explorer.aleo.org'
      : 'https://testnet.aleoscan.io';
    return `${baseUrl}/transaction/${transactionId}`;
  }

  /**
   * Get explorer URL for the program
   */
  getProgramExplorerUrl(): string {
    const baseUrl = this.config.network === 'mainnet'
      ? 'https://explorer.aleo.org'
      : 'https://testnet.aleoscan.io';
    return `${baseUrl}/program/${this.config.votingProgramId}`;
  }
}

export const aleoService = new AleoService();
