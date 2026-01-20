// Aleo Service for VoteAleo contract interactions

import { AleoConfig, Campaign, VotingOption } from '@/types';

const config: AleoConfig = {
  network: (process.env.NEXT_PUBLIC_ALEO_NETWORK as 'testnet' | 'mainnet') || 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1',
  votingProgramId: process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID || 'vote_privacy_6723.aleo',
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
   * Encode a string (up to 31 bytes) as a field element
   * Format: [length (1 byte)] [data bytes...]
   * Stored as: data_bigint * 256 + length
   */
  encodeStringToField(input: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);

    // Field can safely hold ~31 bytes
    if (bytes.length > 31) {
      throw new Error('String too long for single field (max 31 bytes)');
    }

    // Convert bytes to BigInt (big-endian: first byte is most significant)
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
      result = (result << BigInt(8)) | BigInt(bytes[i]);
    }

    // Store length in the lowest 8 bits
    result = (result << BigInt(8)) | BigInt(bytes.length);

    return `${result}field`;
  }

  /**
   * Decode a field element back to a string
   * Tries multiple decoding approaches for compatibility
   */
  decodeFieldToString(fieldValue: string): string {
    // Remove 'field' suffix
    const numStr = fieldValue.replace(/field$/, '').trim();
    let num = BigInt(numStr);

    console.log(`Decoding field value: ${numStr.slice(0, 20)}...${numStr.slice(-10)}`);

    // Try method 1: Length in lowest 8 bits (original method)
    const length1 = Number(num % BigInt(256));
    if (length1 > 0 && length1 <= 31) {
      let tempNum = num / BigInt(256);
      const bytes = new Uint8Array(length1);
      let valid = true;

      for (let i = length1 - 1; i >= 0; i--) {
        const byte = Number(tempNum % BigInt(256));
        // Check if it's a valid ASCII printable character
        if (byte < 32 || byte > 126) {
          valid = false;
          break;
        }
        bytes[i] = byte;
        tempNum = tempNum / BigInt(256);
      }

      if (valid) {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const result = decoder.decode(bytes);
        console.log(`Method 1 decoded: length=${length1}, result="${result}"`);
        return result;
      }
    }

    // Try method 2: Fixed 31-byte extraction (no length byte)
    // Assumes the full 31 bytes were encoded
    const fixedBytes = new Uint8Array(31);
    let tempNum2 = num;
    let validChars = 0;

    for (let i = 30; i >= 0; i--) {
      const byte = Number(tempNum2 % BigInt(256));
      fixedBytes[i] = byte;
      tempNum2 = tempNum2 / BigInt(256);
      // Count valid ASCII chars
      if (byte >= 32 && byte <= 126) validChars++;
    }

    // If most chars are valid ASCII, try to decode
    if (validChars > 20) {
      // Find the actual content (trim null bytes)
      let start = 0;
      let end = 31;
      while (start < 31 && (fixedBytes[start] === 0 || fixedBytes[start] < 32)) start++;
      while (end > start && (fixedBytes[end - 1] === 0 || fixedBytes[end - 1] < 32)) end--;

      if (end > start) {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const result = decoder.decode(fixedBytes.slice(start, end));
        console.log(`Method 2 decoded: "${result}"`);
        return result;
      }
    }

    console.warn(`Could not decode field value`);
    return '';
  }

  /**
   * Encode an IPFS CID into two field elements
   * CIDs are typically 46-59 characters, split into two parts
   */
  encodeCidToFields(cid: string): { part1: string; part2: string } {
    console.log(`Encoding CID: "${cid}" (length: ${cid.length})`);

    // Split at 31 characters (not bytes, since CIDs are ASCII)
    const part1Str = cid.slice(0, 31);
    const part2Str = cid.slice(31);

    console.log(`Part1 string: "${part1Str}" (${part1Str.length})`);
    console.log(`Part2 string: "${part2Str}" (${part2Str.length})`);

    const part1 = this.encodeStringToField(part1Str);
    const part2 = this.encodeStringToField(part2Str);

    console.log(`Part1 field: ${part1}`);
    console.log(`Part2 field: ${part2}`);

    // Verify encoding by decoding immediately
    const decoded1 = this.decodeFieldToString(part1);
    const decoded2 = this.decodeFieldToString(part2);
    console.log(`Verification - Part1 decoded: "${decoded1}"`);
    console.log(`Verification - Part2 decoded: "${decoded2}"`);

    if (decoded1 !== part1Str || decoded2 !== part2Str) {
      console.error('ENCODING VERIFICATION FAILED!');
      console.error(`  Expected part1: "${part1Str}", got: "${decoded1}"`);
      console.error(`  Expected part2: "${part2Str}", got: "${decoded2}"`);
    }

    return { part1, part2 };
  }

  /**
   * Decode two field elements back to an IPFS CID
   */
  decodeFieldsToCid(part1: string, part2: string): string {
    console.log(`Decoding CID from fields:`);
    console.log(`  Part1 field: ${part1.slice(0, 30)}...`);
    console.log(`  Part2 field: ${part2.slice(0, 30)}...`);

    const str1 = this.decodeFieldToString(part1);
    const str2 = this.decodeFieldToString(part2);
    const result = str1 + str2;

    console.log(`  Decoded part1: "${str1}"`);
    console.log(`  Decoded part2: "${str2}"`);
    console.log(`  Full CID: "${result}"`);

    // Validate the result looks like a CID
    if (result.startsWith('Qm') || result.startsWith('bafy') || result.startsWith('bafk')) {
      console.log('CID validation: PASSED');
      return result;
    }

    // Check if result contains mostly valid base32 characters (might be partial CID)
    const base32Chars = /^[a-z2-7]+$/;
    const cleanResult = result.replace(/[^a-z2-7]/g, '');
    if (cleanResult.length > 30 && base32Chars.test(cleanResult)) {
      // Try reconstructing with common prefixes
      const prefixes = ['bafkrei', 'bafybei', 'bafkree', 'bafybee'];
      for (const prefix of prefixes) {
        const testCid = prefix + cleanResult;
        if (testCid.length >= 50 && testCid.length <= 65) {
          console.log(`Attempting CID reconstruction: ${testCid}`);
          return testCid;
        }
      }
    }

    console.warn(`CID validation: FAILED - doesn't match known CID formats`);
    return '';
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
   * Fetch all campaigns using Aleoscan API
   */
  async fetchAllCampaigns(): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.testnet.aleoscan.io/v2/mapping/list_program_mapping_values/${this.config.votingProgramId}/campaigns`
      );

      if (!response.ok) {
        console.log('Failed to fetch campaigns from Aleoscan');
        return [];
      }

      const data = await response.json();
      console.log('All campaigns from Aleoscan:', data);

      if (data.result && Array.isArray(data.result)) {
        return data.result.map((entry: any) => ({
          id: entry.key,
          data: entry.value
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching all campaigns:', error);
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
