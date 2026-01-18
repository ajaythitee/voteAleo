// Pinata IPFS Service for VoteAleo

import { IPFSUploadResult, CampaignMetadata } from '@/types';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

class PinataService {
  private jwt: string;
  private gateway: string;

  constructor() {
    this.jwt = PINATA_JWT || '';
    this.gateway = PINATA_GATEWAY;
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.jwt}`,
    };
  }

  /**
   * Upload a file to IPFS via Pinata
   */
  async uploadFile(file: File): Promise<IPFSUploadResult> {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        app: 'votealeo',
        type: 'campaign-image',
      },
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file to IPFS');
    }

    const data = await response.json();

    return {
      cid: data.IpfsHash,
      url: this.getGatewayUrl(data.IpfsHash),
      size: data.PinSize,
    };
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadJSON(metadata: CampaignMetadata): Promise<IPFSUploadResult> {
    if (!this.jwt) {
      throw new Error('Pinata JWT not configured');
    }

    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `campaign-${Date.now()}.json`,
            keyvalues: {
              app: 'votealeo',
              type: 'campaign-metadata',
            },
          },
          pinataOptions: {
            cidVersion: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload metadata to IPFS');
    }

    const data = await response.json();

    return {
      cid: data.IpfsHash,
      url: this.getGatewayUrl(data.IpfsHash),
      size: data.PinSize,
    };
  }

  /**
   * Fetch JSON metadata from IPFS
   */
  async fetchJSON<T>(cid: string): Promise<T> {
    const response = await fetch(this.getGatewayUrl(cid));

    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }

    return response.json();
  }

  /**
   * Get gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `https://${this.gateway}/ipfs/${cid}`;
  }

  /**
   * Check if Pinata is configured
   */
  isConfigured(): boolean {
    return !!this.jwt;
  }
}

export const pinataService = new PinataService();
