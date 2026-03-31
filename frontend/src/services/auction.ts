const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;
const RPC_URL = process.env.NEXT_PUBLIC_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const NETWORK = process.env.NEXT_PUBLIC_ALEO_NETWORK || 'testnet';
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

function rpcUrl(path: string): string {
  return `${RPC_URL}/${NETWORK}/program/${AUCTION_PROGRAM_ID}/mapping/${path}`;
}

function chainUrl(path: string): string {
  return `${RPC_URL}/${NETWORK}/${path}`;
}

function backendUrl(path: string): string | null {
  if (!BACKEND_URL) return null;
  return `${BACKEND_URL}${path}`;
}

function parseNumberish(raw: string): number {
  const match = raw.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export const auctionService = {
  getProgramId: (): string => AUCTION_PROGRAM_ID,
  getBackendUrl: (): string => BACKEND_URL,

  async getLatestBlockHeight(): Promise<number> {
    const candidates = [
      chainUrl('block/height/latest'),
      chainUrl('block/latest/height'),
      chainUrl('latest/height'),
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const text = (await res.text()).trim();
        const height = parseNumberish(text);
        if (height > 0) return height;
        try {
          const json = JSON.parse(text) as unknown;
          if (!json || typeof json !== 'object') continue;
          const record = json as Record<string, unknown>;
          const jsonHeight = parseNumberish(String(record.height ?? record.block_height ?? record.latest_height ?? ''));
          if (jsonHeight > 0) return jsonHeight;
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }

    return 0;
  },

  async getAuctionCount(): Promise<number> {
    try {
      const res = await fetch(rpcUrl('auction_counter/0u8'));
      if (!res.ok) return 0;
      return Math.min(parseNumberish(await res.text()), 500);
    } catch {
      return 0;
    }
  },

  async getPublicAuctionIdByIndex(index: number): Promise<string | null> {
    try {
      const res = await fetch(rpcUrl(`public_auction_index/${index}u64`));
      if (!res.ok) return null;
      const raw = (await res.text()).trim();
      return raw || null;
    } catch {
      return null;
    }
  },

  async getPublicAuction(auctionIdKey: string): Promise<unknown> {
    try {
      const res = await fetch(rpcUrl(`auctions/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return null;
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  },

  async getAuctionMeta(auctionIdKey: string): Promise<unknown> {
    const url = backendUrl(`/api/auctions/${encodeURIComponent(auctionIdKey)}`);
    if (!url) return null;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async upsertAuctionMeta(payload: unknown): Promise<unknown> {
    const url = backendUrl('/api/auctions');
    if (!url) return null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getBidCount(auctionIdKey: string): Promise<number> {
    try {
      const auction = await this.getPublicAuction(auctionIdKey);
      if (typeof auction !== 'string') {
        return parseNumberish(JSON.stringify(auction));
      }
      const match = auction.match(/bid_count\s*:\s*(\d+)u64/i);
      return match ? Number(match[1]) : 0;
    } catch {
      return 0;
    }
  },

  async getHighestBid(auctionIdKey: string): Promise<number> {
    try {
      const res = await fetch(rpcUrl(`highest_bids/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return 0;
      return parseNumberish(await res.text());
    } catch {
      return 0;
    }
  },

  async getSecondHighestBid(auctionIdKey: string): Promise<number> {
    try {
      const res = await fetch(rpcUrl(`second_highest_bids/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return 0;
      return parseNumberish(await res.text());
    } catch {
      return 0;
    }
  },

  async getWinningBidId(auctionIdKey: string): Promise<string | null> {
    try {
      const res = await fetch(rpcUrl(`auction_winners/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return null;
      const raw = (await res.text()).trim();
      return raw || null;
    } catch {
      return null;
    }
  },

  async getAuctionSettlement(auctionIdKey: string): Promise<string | null> {
    try {
      const res = await fetch(rpcUrl(`settlements/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return null;
      return (await res.text()).trim() || null;
    } catch {
      return null;
    }
  },

  async getAuctionEscrow(auctionIdKey: string): Promise<number> {
    try {
      const res = await fetch(rpcUrl(`auction_escrow/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return 0;
      return parseNumberish(await res.text());
    } catch {
      return 0;
    }
  },

  async getPlatformTreasury(tokenIndex: number): Promise<number> {
    try {
      const res = await fetch(rpcUrl(`platform_treasury/${tokenIndex}u8`));
      if (!res.ok) return 0;
      return parseNumberish(await res.text());
    } catch {
      return 0;
    }
  },

  async getDisputeData(auctionIdKey: string): Promise<unknown> {
    try {
      const res = await fetch(rpcUrl(`disputes/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return null;
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return text.trim();
      }
    } catch {
      return null;
    }
  },

  async getDutchParams(auctionIdKey: string): Promise<unknown> {
    try {
      const res = await fetch(rpcUrl(`dutch_params/${encodeURIComponent(auctionIdKey)}`));
      if (!res.ok) return null;
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return text.trim();
      }
    } catch {
      return null;
    }
  },

  async listPublicAuctions(): Promise<{ auctionId: string; index: number; data: unknown }[]> {
    const count = await this.getAuctionCount();
    const ids: string[] = [];
    for (let i = 1; i <= count; i++) {
      const auctionId = await this.getPublicAuctionIdByIndex(i);
      if (auctionId) ids.push(auctionId);
    }
    const list: { auctionId: string; index: number; data: unknown }[] = [];
    for (let i = 0; i < ids.length; i++) {
      const auctionId = ids[i];
      const data = await this.getPublicAuction(auctionId);
      if (data != null) list.push({ auctionId, index: i + 1, data });
    }
    return list;
  },

  getExplorerUrl(programId?: string): string {
    const base = NETWORK === 'mainnet' ? 'https://explorer.provable.com' : 'https://testnet.explorer.provable.com';
    return `${base}/program/${programId || AUCTION_PROGRAM_ID}`;
  },

  getTransactionExplorerUrl(transactionId: string): string {
    const base = NETWORK === 'mainnet' ? 'https://explorer.provable.com' : 'https://testnet.explorer.provable.com';
    return `${base}/transaction/${transactionId}`;
  },
};
