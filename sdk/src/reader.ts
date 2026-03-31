import type { RpcConfig } from './types.js';

function parseNumberish(raw: string): number {
  const match = raw.match(/(\\d+)/);
  return match ? Number(match[1]) : 0;
}

function rpcUrl(cfg: RpcConfig, path: string): string {
  return `${cfg.rpcUrl}/${cfg.network}/program/${cfg.auctionProgramId}/mapping/${path}`;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}

export function createAuctionReader(cfg: RpcConfig) {
  return {
    async getAuctionCount(): Promise<number> {
      const raw = await fetchText(rpcUrl(cfg, 'auction_counter/0u8'));
      return raw ? Math.min(parseNumberish(raw), 500) : 0;
    },

    async getPublicAuctionIdByIndex(index: number): Promise<string | null> {
      const raw = await fetchText(rpcUrl(cfg, `public_auction_index/${index}u64`));
      return raw || null;
    },

    async getPublicAuction(auctionId: string): Promise<string | null> {
      const raw = await fetchText(rpcUrl(cfg, `auctions/${encodeURIComponent(auctionId)}`));
      return raw || null;
    },

    async getHighestBid(auctionId: string): Promise<number> {
      const raw = await fetchText(rpcUrl(cfg, `highest_bids/${encodeURIComponent(auctionId)}`));
      return raw ? parseNumberish(raw) : 0;
    },

    async getSecondHighestBid(auctionId: string): Promise<number> {
      const raw = await fetchText(rpcUrl(cfg, `second_highest_bids/${encodeURIComponent(auctionId)}`));
      return raw ? parseNumberish(raw) : 0;
    },

    async getAuctionEscrow(auctionId: string): Promise<number> {
      const raw = await fetchText(rpcUrl(cfg, `auction_escrow/${encodeURIComponent(auctionId)}`));
      return raw ? parseNumberish(raw) : 0;
    },

    async getDutchParams(auctionId: string): Promise<string | null> {
      const raw = await fetchText(rpcUrl(cfg, `dutch_params/${encodeURIComponent(auctionId)}`));
      return raw || null;
    },

    async getDisputeData(auctionId: string): Promise<string | null> {
      const raw = await fetchText(rpcUrl(cfg, `disputes/${encodeURIComponent(auctionId)}`));
      return raw || null;
    },
  };
}

