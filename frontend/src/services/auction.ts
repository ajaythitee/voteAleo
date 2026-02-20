// Auction service for VeilProtocol Auction contract – program ID must be provided via NEXT_PUBLIC_AUCTION_PROGRAM_ID

const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;
const RPC_URL = process.env.NEXT_PUBLIC_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const NETWORK = process.env.NEXT_PUBLIC_ALEO_NETWORK || 'testnet';

function rpcUrl(path: string): string {
  return `${RPC_URL}/${NETWORK}/program/${AUCTION_PROGRAM_ID}/mapping/${path}`;
}

export const auctionService = {
  getProgramId: (): string => AUCTION_PROGRAM_ID,

  /** Get number of public auctions created (1-based index count) */
  async getAuctionCount(): Promise<number> {
    try {
      const res = await fetch(rpcUrl('auction_counter/0u8'));
      if (!res.ok) return 0;
      const text = await res.text();
      // RPC typically returns a simple string like "1u64"
      const match = text.match(/(\d+)/);
      if (!match) return 0;
      const value = Number(match[1]);
      if (!Number.isFinite(value) || value < 0) return 0;
      return Math.min(value, 100);
    } catch {
      return 0;
    }
  },

  /** Get public auction ID (field) by index (1-based) */
  async getPublicAuctionIdByIndex(index: number): Promise<string | null> {
    try {
      const res = await fetch(rpcUrl(`public_auction_index/${index}u64`));
      if (!res.ok) return null;
      const data = await res.json().catch(async () => (await res.text())?.trim());
      if (typeof data === 'string') return data || null;
      return data != null ? String(data) : null;
    } catch {
      return null;
    }
  },

  /** Get auction owner address for a public auction (if set) */
  async getAuctionOwner(auctionIdKey: string): Promise<string | null> {
    try {
      const keyEncoded = encodeURIComponent(auctionIdKey);
      const res = await fetch(rpcUrl(`auction_owners/${keyEncoded}`));
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data != null ? String(data) : null;
    } catch {
      return null;
    }
  },

  /** Get public auction data by auction_id (field key).
   * Prefer raw text to handle RPC returning struct-as-string (like campaigns).
   */
  async getPublicAuction(auctionIdKey: string): Promise<unknown> {
    try {
      const keyEncoded = encodeURIComponent(auctionIdKey);
      const res = await fetch(rpcUrl(`public_auctions/${keyEncoded}`));
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

  /** Get bid count for an auction */
  async getBidCount(auctionIdKey: string): Promise<number> {
    try {
      const keyEncoded = encodeURIComponent(auctionIdKey);
      const res = await fetch(rpcUrl(`bid_count/${keyEncoded}`));
      if (!res.ok) return 0;
      const text = await res.text();
      const match = text.match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    } catch {
      return 0;
    }
  },

  /** Get highest bid amount for an auction */
  async getHighestBid(auctionIdKey: string): Promise<number> {
    try {
      const keyEncoded = encodeURIComponent(auctionIdKey);
      const res = await fetch(rpcUrl(`highest_bids/${keyEncoded}`));
      if (!res.ok) return 0;
      const text = await res.text();
      const match = text.match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    } catch {
      return 0;
    }
  },

  /** Get winning bid id (if auction ended) */
  async getWinningBidId(auctionIdKey: string): Promise<string | null> {
    try {
      const keyEncoded = encodeURIComponent(auctionIdKey);
      const res = await fetch(rpcUrl(`winning_bids/${keyEncoded}`));
      if (!res.ok) return null;
      const data = await res.json().catch(async () => (await res.text())?.trim());
      return data != null && String(data).length > 0 ? String(data) : null;
    } catch {
      return null;
    }
  },

  /** Get a single public bid by bid_id */
  async getPublicBid(
    bidIdKey: string
  ): Promise<{ amount: number; auction_id: string; bid_public_key?: string } | null> {
    try {
      const keyEncoded = encodeURIComponent(bidIdKey);
      const res = await fetch(rpcUrl(`public_bids/${keyEncoded}`));
      if (!res.ok) return null;
      const raw = await res.json().catch(() => res.text());
      if (!raw || typeof raw !== 'object') return null;
      const d = raw as any;
      const amount =
        typeof d.amount === 'number' ? d.amount : parseInt(String(d.amount || 0).replace(/\D/g, ''), 10) || 0;
      const auction_id = d.auction_id != null ? String(d.auction_id) : '';
      const bid_public_key = d.bid_public_key != null ? String(d.bid_public_key) : undefined;
      return { amount, auction_id, bid_public_key };
    } catch {
      return null;
    }
  },

  /** List all public auctions (index 1..count) */
  async listPublicAuctions(): Promise<{ auctionId: string; index: number; data: unknown }[]> {
    const count = await this.getAuctionCount();
    const list: { auctionId: string; index: number; data: unknown }[] = [];
    for (let i = 1; i <= count; i++) {
      const auctionId = await this.getPublicAuctionIdByIndex(i);
      if (!auctionId) continue;
      const data = await this.getPublicAuction(auctionId);
      if (data != null) list.push({ auctionId, index: i, data });
    }
    return list.reverse(); // newest first
  },

  getExplorerUrl(programId?: string): string {
    const base = NETWORK === 'mainnet' ? 'https://explorer.aleo.org' : 'https://testnet.aleoscan.io';
    return `${base}/program/${programId || AUCTION_PROGRAM_ID}`;
  },
};
