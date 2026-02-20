// Shared campaign parser: Aleo struct string -> Campaign
// Used by campaigns, campaign/[id], my-campaigns, history, and home.

import type { Campaign, CampaignMetadata } from '@/types';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';

/**
 * Parse Aleo struct string format (handles nested structs like metadata_cid).
 */
export function parseAleoStruct(str: string): Record<string, string> | null {
  try {
    let content = str.replace(/^\s*\{|\}\s*$/g, '').trim();
    content = content.replace(/\n/g, ' ');
    if (!content) return null;

    const result: Record<string, string> = {};

    const nestedMatch = content.match(/metadata_cid\s*:\s*\{\s*part1\s*:\s*(\d+)field\s*,\s*part2\s*:\s*(\d+)field\s*\}/i);
    if (nestedMatch) {
      result['metadata_cid.part1'] = nestedMatch[1] + 'field';
      result['metadata_cid.part2'] = nestedMatch[2] + 'field';
      content = content.replace(/metadata_cid\s*:\s*\{[^}]+\}/i, '');
    } else {
      const part1Match = content.match(/part1\s*:\s*(\d+)field/i);
      const part2Match = content.match(/part2\s*:\s*(\d+)field/i);
      if (part1Match && part2Match) {
        result['metadata_cid.part1'] = part1Match[1] + 'field';
        result['metadata_cid.part2'] = part2Match[1] + 'field';
      }
    }

    const simpleRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,{}]+?)(?:,|$)/g;
    let match;
    while ((match = simpleRegex.exec(content)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      const cleanValue = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();
      result[key] = cleanValue;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Parse on-chain campaign data and fetch metadata from IPFS; returns a Campaign or null.
 */
export async function parseOnChainCampaign(data: unknown, id: number): Promise<Campaign | null> {
  try {
    if (typeof data !== 'string') return null;

    const parsed = parseAleoStruct(data);
    if (!parsed) return null;

    let title = `Campaign #${id}`;
    let description = 'Campaign on Privote';
    let imageUrl = '/images/default-campaign.svg';
    let options: { id: string; label: string; voteCount: number }[] = [];
    let minVotes: number | undefined;
    let category: string | undefined;

    const cidPart1 = parsed['metadata_cid.part1'];
    const cidPart2 = parsed['metadata_cid.part2'];

    if (cidPart1 && cidPart2) {
      try {
        const part1WithSuffix = cidPart1.includes('field') ? cidPart1 : cidPart1 + 'field';
        const part2WithSuffix = cidPart2.includes('field') ? cidPart2 : cidPart2 + 'field';
        const cid = aleoService.decodeFieldsToCid(part1WithSuffix, part2WithSuffix);

        if (cid && cid.length > 10) {
          try {
            const metadata = await pinataService.fetchJSON<CampaignMetadata>(cid);
            if (metadata) {
              title = metadata.title || title;
              description = metadata.description || description;
              if (metadata.imageCid) {
                imageUrl = pinataService.getGatewayUrl(metadata.imageCid);
              }
              if (metadata.options && Array.isArray(metadata.options)) {
                options = metadata.options.map((label, idx) => ({
                  id: String(idx),
                  label: typeof label === 'string' ? label : `Option ${idx + 1}`,
                  voteCount: Number(parsed[`votes_${idx}`] || 0),
                }));
              }
              if (metadata.minVotes != null && metadata.minVotes > 0) minVotes = metadata.minVotes;
              if (metadata.category?.trim()) category = metadata.category.trim();
            }
          } catch {
            // ignore IPFS fetch errors
          }
        }
      } catch {
        // ignore decode errors
      }
    }

    if (options.length === 0) {
      const optionCount = Number(parsed.option_count || 2);
      options = Array.from({ length: optionCount }, (_, idx) => ({
        id: String(idx),
        label: `Option ${idx + 1}`,
        voteCount: Number(parsed[`votes_${idx}`] || 0),
      }));
    }

    const totalVotes = Number(parsed.total_votes || 0);

    return {
      id: String(id),
      title,
      description,
      imageUrl,
      creator: parsed.creator || '',
      startTime: new Date(Number(parsed.start_time || 0) * 1000),
      endTime: new Date(Number(parsed.end_time || 0) * 1000),
      options,
      totalVotes,
      isActive: parsed.is_active === 'true',
      createdAt: new Date(),
      onChainId: id,
      minVotes,
      category,
    };
  } catch {
    return null;
  }
}
