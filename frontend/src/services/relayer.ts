// Relayer Service for Gasless Transactions

const RELAYER_BASE_URL = process.env.NEXT_PUBLIC_RELAYER_URL || '/api/relay';

interface RelayerResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

interface VoteRequest {
  campaignId: number;
  optionIndex: number;
  voterAddress: string;
  timestamp?: number;
}

interface CreateCampaignRequest {
  cidPart1: string;
  cidPart2: string;
  startTime: number;
  endTime: number;
  optionCount: number;
  creatorAddress: string;
}

class RelayerService {
  private baseUrl: string;

  constructor() {
    // Use internal API routes by default
    this.baseUrl = '/api/relay';
  }

  /**
   * Check if the relayer is available and configured
   */
  async checkHealth(): Promise<{ status: string; relayerAddress?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/vote`, {
        method: 'GET',
      });
      return await response.json();
    } catch (error) {
      console.error('Relayer health check failed:', error);
      return { status: 'unavailable' };
    }
  }

  /**
   * Submit a gasless vote via the relayer
   */
  async submitVote(request: VoteRequest): Promise<RelayerResponse> {
    try {
      console.log('Relayer: Submitting gasless vote', request);

      const response = await fetch(`${this.baseUrl}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: request.campaignId,
          optionIndex: request.optionIndex,
          voterAddress: request.voterAddress,
          timestamp: request.timestamp || Math.floor(Date.now() / 1000),
        }),
      });

      const data = await response.json();
      console.log('Relayer vote response:', data);

      return data;
    } catch (error: any) {
      console.error('Relayer vote error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit vote via relayer',
      };
    }
  }

  /**
   * Create a campaign via the relayer (gasless)
   */
  async createCampaign(request: CreateCampaignRequest): Promise<RelayerResponse> {
    try {
      console.log('Relayer: Creating gasless campaign', {
        ...request,
        cidPart1: request.cidPart1.slice(0, 30) + '...',
        cidPart2: request.cidPart2.slice(0, 30) + '...',
      });

      const response = await fetch(`${this.baseUrl}/create-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      console.log('Relayer create campaign response:', data);

      return data;
    } catch (error: any) {
      console.error('Relayer create campaign error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create campaign via relayer',
      };
    }
  }

  /**
   * Check if relayer is configured and available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.status === 'ready';
    } catch {
      return false;
    }
  }
}

export const relayerService = new RelayerService();
