// Shared auction parser: Aleo struct string/object -> Auction display data
// Mirrors campaignParser approach for consistency

import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';

export interface ParsedAuction {
  name: string;
  description?: string;
  startingBid: number;
  imageUrl?: string;
}

/**
 * Parse Aleo auction struct string format.
 * Struct: auction { starting_bid: u64, name: field, item: { id: field, offchain_data: [field; 4] } }
 */
function parseAleoAuctionStruct(str: string): { startingBid: number; nameField: string; cidPart1?: string; cidPart2?: string } | null {
  try {
    const content = str.replace(/^\s*\{|\}\s*$/g, '').trim().replace(/\n/g, ' ');
    if (!content) return null;

    let startingBid = 0;
    let nameField = '';
    let cidPart1: string | undefined;
    let cidPart2: string | undefined;

    const startMatch = content.match(/starting_bid\s*:\s*(\d+)u64/i);
    if (startMatch) startingBid = Number(startMatch[1]);

    const nameMatch = content.match(/name\s*:\s*(\d+field)/i);
    if (nameMatch) nameField = nameMatch[1];

    const offchainMatch = content.match(/offchain_data\s*:\s*\[\s*([^,\]]+)\s*,\s*([^,\]]+)/i);
    if (offchainMatch) {
      const p1 = offchainMatch[1].trim();
      const p2 = offchainMatch[2].trim();
      if (p1.includes('field') && p2.includes('field')) {
        cidPart1 = p1.endsWith('field') ? p1 : p1.replace(/\s*$/, '') + 'field';
        cidPart2 = p2.endsWith('field') ? p2 : p2.replace(/\s*$/, '') + 'field';
      }
    }

    return { startingBid, nameField, cidPart1, cidPart2 };
  } catch {
    return null;
  }
}

/**
 * Extract fields from JSON-like auction object (RPC may return parsed object).
 */
function parseAuctionObject(obj: Record<string, unknown>): { startingBid: number; nameField: string; cidPart1?: string; cidPart2?: string } | null {
  try {
    const inner = (typeof obj.value === 'object' ? obj.value : obj) as Record<string, unknown>;
    const d = inner ?? obj;

    let startingBid = 0;
    const rawStart = d?.starting_bid ?? (d as any)?.startingBid;
    if (typeof rawStart === 'number') startingBid = rawStart;
    else if (typeof rawStart === 'string') {
      const m = String(rawStart).match(/(\d+)/);
      if (m) startingBid = Number(m[1]);
    }

    const rawName = d?.name ?? (d as any)?.auction_name;
    let nameField = '';
    if (rawName != null) {
      const s = String(rawName).trim();
      if (s) nameField = /field$/i.test(s) ? s : /^\d+$/.test(s) ? `${s}field` : s;
    }

    const item = (d?.item ?? (d as any)?.item) as Record<string, unknown> | undefined;
    const off = item?.offchain_data;
    let cidPart1: string | undefined;
    let cidPart2: string | undefined;
    if (Array.isArray(off) && off.length >= 2) {
      cidPart1 = String(off[0]).trim();
      cidPart2 = String(off[1]).trim();
      if (!cidPart1.endsWith('field')) cidPart1 = undefined;
      if (!cidPart2.endsWith('field')) cidPart2 = undefined;
    }

    return { startingBid, nameField, cidPart1, cidPart2 };
  } catch {
    return null;
  }
}

/**
 * Parse on-chain auction data and fetch metadata from IPFS.
 * Handles both string (struct format) and object responses from RPC.
 */
export async function parseOnChainAuction(data: unknown, _auctionId: string): Promise<ParsedAuction | null> {
  try {
    let parsed: { startingBid: number; nameField: string; cidPart1?: string; cidPart2?: string } | null = null;

    if (typeof data === 'string') {
      parsed = parseAleoAuctionStruct(data);
    } else if (data && typeof data === 'object') {
      parsed = parseAuctionObject(data as Record<string, unknown>);
    }

    if (!parsed) return null;

    let name = 'Untitled';
    let description: string | undefined;
    let imageUrl: string | undefined;

    if (parsed.cidPart1 && parsed.cidPart2) {
      try {
        const part1 = parsed.cidPart1.includes('field') ? parsed.cidPart1 : parsed.cidPart1 + 'field';
        const part2 = parsed.cidPart2.includes('field') ? parsed.cidPart2 : parsed.cidPart2 + 'field';
        const cid = aleoService.decodeFieldsToCid(part1, part2);

        if (cid && cid.length > 10) {
          try {
            const metadata = await pinataService.fetchJSON<Record<string, unknown>>(cid);
            if (metadata) {
              name = typeof metadata.name === 'string' ? metadata.name.trim() : name;
              description = typeof metadata.description === 'string' ? metadata.description : undefined;
              const imageCid = typeof metadata.imageCid === 'string' ? metadata.imageCid : '';
              if (imageCid) imageUrl = pinataService.getGatewayUrl(imageCid);
            }
          } catch {
            // ignore IPFS fetch errors
          }
        }
      } catch {
        // ignore decode errors
      }
    }

    if (name === 'Untitled' && parsed.nameField) {
      const decoded = aleoService.decodeFieldToString(parsed.nameField);
      if (decoded && decoded.trim()) name = decoded.trim();
    }

    return {
      name,
      description,
      startingBid: parsed.startingBid,
      imageUrl,
    };
  } catch {
    return null;
  }
}
