import { parseOnChainAuction as parseOnChainAuctionSdk, type ParsedAuction } from '@veil/sdk';
import { auctionService } from '@/services/auction';

export type { ParsedAuction };

export async function parseOnChainAuction(data: unknown, auctionId: string): Promise<ParsedAuction | null> {
  let meta: Partial<ParsedAuction> | null = null;
  if (typeof window !== 'undefined') {
    try {
      const payload = (await auctionService.getAuctionMeta(auctionId)) as { item?: Partial<ParsedAuction> | null } | null;
      meta = payload?.item ?? null;
    } catch {
      meta = null;
    }
  }
  return parseOnChainAuctionSdk(data, auctionId, meta);
}

