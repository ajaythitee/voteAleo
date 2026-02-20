// Auction service for Privote Auction contract (privote_auction_4000.aleo)

const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID || 'privote_auction_4000.aleo';
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
      const data = await res.json().catch(async () => ({ raw: await res.text() }));
      if (typeof data === 'number') return Math.min(data, 100);
      if (data?.raw) {
        const match = String(data.raw).match(/(\d+)u64/);
        return match ? Math.min(Number(match[1]), 100) : 0;
      }
      return 0;
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

  /** Get public auction data by auction_id (field key) */
  async getPublicAuction(auctionIdKey: string): Promise<unknown> {
    try {
      const keyEncoded = encodeURIComponent(auctionIdKey);
      const res = await fetch(rpcUrl(`public_auctions/${keyEncoded}`));
      if (!res.ok) return null;
      return await res.json().catch(() => res.text());
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
