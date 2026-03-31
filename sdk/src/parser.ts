import type { ParsedAuction } from './types.js';

function parseFieldNumber(source: string, fieldName: string): number {
  const match = source.match(new RegExp(`${fieldName}\\s*:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : 0;
}

export function parseOnChainAuction(data: unknown, auctionId: string, meta?: Partial<ParsedAuction> | null): ParsedAuction | null {
  try {
    const raw = typeof data === 'string' ? data : JSON.stringify(data ?? {});
    const mode = parseFieldNumber(raw, 'auction_mode');
    const token = parseFieldNumber(raw, 'token_type');

    return {
      name: meta?.name || `Auction ${auctionId.slice(0, 8)}`,
      description: meta?.description,
      imageUrl: meta?.imageUrl,
      startingBid: meta?.startingBid ?? 0,
      strategy:
        meta?.strategy === 'vickrey' || meta?.strategy === 'dutch' || meta?.strategy === 'english'
          ? meta.strategy
          : mode === 4
            ? 'english'
            : mode === 3
              ? 'dutch'
              : mode === 2
                ? 'vickrey'
                : 'first_price',
      tokenType:
        meta?.tokenType === 'usdcx' || meta?.tokenType === 'usad'
          ? meta.tokenType
          : token === 3
            ? 'usad'
            : token === 2
              ? 'usdcx'
              : 'aleo',
    };
  } catch {
    return null;
  }
}

