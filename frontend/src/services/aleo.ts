// Aleo Service for VeilProtocol contract interactions
// Using the proven encoding approach from zk-auction-example

import { AleoConfig, Campaign, VotingOption } from '@/types';

const config: AleoConfig = {
  network: (process.env.NEXT_PUBLIC_ALEO_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1',
  votingProgramId: process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string,
};

// Aleo field modulus for proper field arithmetic
const FIELD_MODULUS = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040');

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
   * Convert a string to a BigInt (bytes in big-endian order)
   */
  private stringToBigInt(input: string): bigint {
    const encoder = new TextEncoder();
    const encodedBytes = encoder.encode(input);

    let bigIntValue = BigInt(0);
    for (let i = 0; i < encodedBytes.length; i++) {
      bigIntValue = (bigIntValue << BigInt(8)) | BigInt(encodedBytes[i]);
    }

    return bigIntValue;
  }

  /**
   * Convert a BigInt back to a string
   */
  private bigIntToString(bigIntValue: bigint): string {
    if (bigIntValue === BigInt(0)) return '';

    const bytes: number[] = [];
    let tempBigInt = bigIntValue;

    while (tempBigInt > BigInt(0)) {
      const byteValue = Number(tempBigInt & BigInt(255));
      bytes.unshift(byteValue); // Add to front for big-endian
      tempBigInt = tempBigInt >> BigInt(8);
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(Uint8Array.from(bytes));
  }

  /**
   * Encode a string into multiple field elements using field modulus
   * This is the proven approach from zk-auction-example
   */
  stringToFields(input: string, numFieldElements: number = 2): bigint[] {
    const bigIntValue = this.stringToBigInt(input);
    const fieldElements: bigint[] = [];
    let remainingValue = bigIntValue;

    for (let i = 0; i < numFieldElements; i++) {
      const fieldElement = remainingValue % FIELD_MODULUS;
      fieldElements.push(fieldElement);
      remainingValue = remainingValue / FIELD_MODULUS;
    }

    if (remainingValue !== BigInt(0)) {
      console.warn(`String "${input}" is too big for ${numFieldElements} fields, some data may be lost`);
    }

    return fieldElements;
  }

  /**
   * Decode field elements back to a string using field modulus
   */
  fieldsToString(fields: bigint[]): string {
    let bigIntValue = BigInt(0);
    let multiplier = BigInt(1);

    for (const fieldElement of fields) {
      bigIntValue += fieldElement * multiplier;
      multiplier *= FIELD_MODULUS;
    }

    return this.bigIntToString(bigIntValue);
  }

  /**
   * Encode a string into a single field element (for auction name, etc.)
   * Long strings may be truncated to fit in one field.
   */
  encodeStringToSingleField(input: string): string {
    const fields = this.stringToFields(input, 1);
    return `${fields[0]}field`;
  }

  /**
   * Encode an IPFS CID into two field elements
   * Uses the field modulus approach for reliable encoding/decoding
   */
  encodeCidToFields(cid: string): { part1: string; part2: string } {
    console.log(`Encoding CID: "${cid}" (length: ${cid.length})`);

    const fields = this.stringToFields(cid, 2);
    const part1 = `${fields[0]}field`;
    const part2 = `${fields[1]}field`;

    console.log(`Part1 field: ${part1.slice(0, 40)}...`);
    console.log(`Part2 field: ${part2.slice(0, 40)}...`);

    // Verify encoding
    const decoded = this.fieldsToString(fields);
    console.log(`Verification - Decoded CID: "${decoded}"`);

    if (decoded !== cid) {
      console.error('ENCODING VERIFICATION FAILED!');
      console.error(`  Expected: "${cid}"`);
      console.error(`  Got: "${decoded}"`);
    } else {
      console.log('Encoding verification: PASSED');
    }

    return { part1, part2 };
  }

  /**
   * Decode two field elements back to an IPFS CID
   * Uses field modulus approach for reliable decoding
   */
  decodeFieldsToCid(part1: string, part2: string): string {
    console.log(`Decoding CID from fields:`);
    console.log(`  Part1 field: ${part1.slice(0, 40)}...`);
    console.log(`  Part2 field: ${part2.slice(0, 40)}...`);

    try {
      // Extract the numeric value from field strings
      const field1 = BigInt(part1.replace(/field$/, '').trim());
      const field2 = BigInt(part2.replace(/field$/, '').trim());

      const result = this.fieldsToString([field1, field2]);
      console.log(`  Decoded CID: "${result}"`);

      // Validate the result looks like a CID
      if (result && (result.startsWith('Qm') || result.startsWith('bafy') || result.startsWith('bafk'))) {
        console.log('CID validation: PASSED');
        return result;
      }

      // For CIDv1, check if it has valid base32 characters
      if (result && result.length >= 46 && /^[a-z2-7]+$/i.test(result)) {
        console.log('CID validation: PASSED (base32 format)');
        return result;
      }

      console.warn(`CID validation: Result doesn't match known CID formats`);
      return result;
    } catch (e) {
      console.error('Error decoding CID:', e);
      return '';
    }
  }

  // Legacy method for backwards compatibility
  encodeStringToField(input: string): string {
    const fields = this.stringToFields(input, 1);
    return `${fields[0]}field`;
  }

  // Legacy method for backwards compatibility
  decodeFieldToString(fieldValue: string): string {
    const field = BigInt(fieldValue.replace(/field$/, '').trim());
    return this.fieldsToString([field]);
  }

  /**
   * Hash a string to field element (one-way, for vote tracking etc)
   */
  hashToField(input: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);

    let result = BigInt(0);
    const prime = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');

    for (let i = 0; i < bytes.length; i++) {
      result = (result * BigInt(256) + BigInt(bytes[i])) % prime;
    }

    return `${result}field`;
  }

  /**
   * Format inputs for create_campaign transition
   * Uses two field elements for CID storage
   */
  formatCreateCampaignInputs(
    cid: string,
    startTime: number,
    endTime: number,
    optionCount: number
  ): string[] {
    const { part1, part2 } = this.encodeCidToFields(cid);
    return [
      part1,
      part2,
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
  async fetchCampaign(campaignId: number): Promise<any | null> {
    try {
      const response = await fetch(
        `${this.config.rpcUrl}/${this.config.network}/program/${this.config.votingProgramId}/mapping/campaigns/${campaignId}u64`
      );

      if (!response.ok) {
        console.log(`Campaign ${campaignId} not found, status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`Campaign ${campaignId} data:`, data);
      return data;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  }

  /**
   * Fetch all campaigns directly from the Provable RPC by walking the counter mapping.
   * Returns an array of { id: '1u64', data: <raw mapping value> } similar to the old Aleoscan shape.
   */
  async fetchAllCampaigns(): Promise<{ id: string; data: unknown }[]> {
    try {
      const count = await this.getCampaignCount();
      if (!count || count <= 0) return [];

      const results: { id: string; data: unknown }[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const campaign = await this.fetchCampaign(i);
          if (campaign != null) {
            results.push({ id: `${i}u64`, data: campaign });
          }
        } catch (e) {
          console.warn(`Failed to fetch campaign ${i} from RPC:`, e);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching all campaigns from RPC:', error);
      return [];
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
