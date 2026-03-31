import { Auction } from '../models/Auction.js';
import type { AuctionStatus, AuctionStrategy, AuctionTokenType } from '../types.js';

function parseNumberish(raw: string): number {
  const match = raw.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function parseFieldNumber(source: string, key: string): number {
  const match = source.match(new RegExp(`${key}\\s*:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : 0;
}

function mapStatus(code: number): AuctionStatus {
  switch (code) {
    case 1:
      return 'ACTIVE';
    case 2:
      return 'CLOSED';
    case 3:
      return 'REVEALING';
    case 4:
      return 'SETTLED';
    case 5:
      return 'CANCELLED';
    case 6:
      return 'FAILED';
    case 7:
      return 'DISPUTED';
    case 8:
      return 'EXPIRED';
    default:
      return 'UNKNOWN';
  }
}

function mapMode(code: number): AuctionStrategy {
  switch (code) {
    case 2:
      return 'vickrey';
    case 3:
      return 'dutch';
    case 4:
      return 'english';
    default:
      return 'first_price';
  }
}

function mapToken(code: number): AuctionTokenType {
  switch (code) {
    case 2:
      return 'usdcx';
    case 3:
      return 'usad';
    default:
      return 'aleo';
  }
}

function rpcUrl(base: string, network: string, programId: string, path: string): string {
  return `${base}/${network}/program/${programId}/mapping/${path}`;
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

export function startIndexer(config: {
  intervalMs: number;
  aleoRpcUrl: string;
  network: string;
  programId: string;
}): void {
  const tick = async () => {
    const counterRaw = await fetchText(rpcUrl(config.aleoRpcUrl, config.network, config.programId, 'auction_counter/0u8'));
    const count = counterRaw ? Math.min(parseNumberish(counterRaw), 500) : 0;
    if (count <= 0) return;

    for (let i = 1; i <= count; i++) {
      const idRaw = await fetchText(
        rpcUrl(config.aleoRpcUrl, config.network, config.programId, `public_auction_index/${i}u64`)
      );
      if (!idRaw) continue;
      const auctionId = idRaw;

      const auctionRaw = await fetchText(
        rpcUrl(config.aleoRpcUrl, config.network, config.programId, `auctions/${encodeURIComponent(auctionId)}`)
      );
      if (!auctionRaw) continue;

      const statusCode = parseFieldNumber(auctionRaw, 'status');
      const modeCode = parseFieldNumber(auctionRaw, 'auction_mode');
      const tokenCode = parseFieldNumber(auctionRaw, 'token_type');
      const bidCount = parseFieldNumber(auctionRaw, 'bid_count');
      const deadline = parseFieldNumber(auctionRaw, 'deadline');

      await Auction.findOneAndUpdate(
        { auctionId },
        {
          $set: {
            status: mapStatus(statusCode),
            mode: modeCode,
            strategy: mapMode(modeCode),
            tokenType: mapToken(tokenCode),
            bidCount,
            deadline,
          },
          $setOnInsert: {
            name: `Auction ${auctionId.slice(0, 8)}`,
            description: '',
            imageUrl: '',
            creatorAddress: '',
            originalDeadline: 0,
          },
        },
        { upsert: true }
      );
    }
  };

  void tick();
  setInterval(() => void tick(), config.intervalMs);
}

