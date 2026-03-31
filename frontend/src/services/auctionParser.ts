// Shared auction parser: Aleo struct string/object -> Auction display data
// Mirrors campaignParser approach for consistency

export interface ParsedAuction {
  name: string;
  description?: string;
  startingBid: number;
  imageUrl?: string;
  strategy?: 'first_price' | 'vickrey' | 'dutch' | 'english';
  tokenType?: 'aleo' | 'usdcx' | 'usad';
}

function parseFieldNumber(source: string, fieldName: string): number {
  const match = source.match(new RegExp(`${fieldName}\\s*:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : 0;
}

/**
 * Parse on-chain auction data and fetch metadata from IPFS.
 * Handles Obscura AuctionData struct and local metadata cache.
 */
export async function parseOnChainAuction(data: unknown, auctionId: string): Promise<ParsedAuction | null> {
  try {
    const raw = typeof data === 'string' ? data : JSON.stringify(data ?? {});
    const mode = parseFieldNumber(raw, 'auction_mode');
    const token = parseFieldNumber(raw, 'token_type');
    let remoteMeta: Partial<ParsedAuction> | null = null;
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/auctions/${encodeURIComponent(auctionId)}`, { cache: 'no-store' });
        if (res.ok) {
          const payload = (await res.json()) as { item?: Partial<ParsedAuction> | null };
          remoteMeta = payload.item ?? null;
        }
      } catch {
        remoteMeta = null;
      }
    }
    return {
      name: remoteMeta?.name || `Auction ${auctionId.slice(0, 8)}`,
      description: remoteMeta?.description,
      imageUrl: remoteMeta?.imageUrl,
      startingBid: 0,
      strategy:
        remoteMeta?.strategy === 'vickrey' ||
        remoteMeta?.strategy === 'dutch' ||
        remoteMeta?.strategy === 'english'
          ? remoteMeta.strategy
          : mode === 2
            ? 'vickrey'
            : 'first_price',
      tokenType: remoteMeta?.tokenType === 'usdcx' || remoteMeta?.tokenType === 'usad' ? remoteMeta.tokenType : token === 2 ? 'usdcx' : 'aleo',
    };
  } catch {
    return null;
  }
}
