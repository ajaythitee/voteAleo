import type { BackendAuction, DutchParams, OnChainAuction } from './types.js';
import { fetchJson, fetchText, parseFieldNumber, tryGetLatestBlockHeight, leoExecute } from './utils.js';
import { MODE_DUTCH, MODE_ENGLISH, MODE_FIRST_PRICE, MODE_VICKREY, STATUS_ACTIVE } from '@veil/sdk';

function rpcMappingUrl(base: string, network: string, programId: string, path: string): string {
  return `${base}/${network}/program/${programId}/mapping/${path}`;
}

async function getOnChainAuction(base: string, network: string, programId: string, auctionId: string): Promise<OnChainAuction | null> {
  const raw = await fetchText(rpcMappingUrl(base, network, programId, `auctions/${encodeURIComponent(auctionId)}`));
  if (!raw) return null;
  return {
    status: parseFieldNumber(raw, 'status'),
    mode: parseFieldNumber(raw, 'auction_mode'),
    tokenType: parseFieldNumber(raw, 'token_type'),
    bidCount: parseFieldNumber(raw, 'bid_count'),
    deadline: parseFieldNumber(raw, 'deadline'),
    createdAt: parseFieldNumber(raw, 'created_at'),
    disputeDeadline: parseFieldNumber(raw, 'dispute_deadline'),
  };
}

async function getDutchParams(base: string, network: string, programId: string, auctionId: string): Promise<DutchParams | null> {
  const raw = await fetchText(rpcMappingUrl(base, network, programId, `dutch_params/${encodeURIComponent(auctionId)}`));
  if (!raw) return null;
  return {
    startPrice: parseFieldNumber(raw, 'start_price'),
    endPrice: parseFieldNumber(raw, 'end_price'),
  };
}

function currentDutchPrice(params: DutchParams, createdAt: number, deadline: number, height: number): number | null {
  const total = deadline - createdAt;
  if (total <= 0) return null;
  const elapsed = Math.min(total, Math.max(0, height - createdAt));
  const delta = params.startPrice - params.endPrice;
  if (delta <= 0) return params.endPrice;
  return Math.max(params.endPrice, Math.floor(params.startPrice - (delta * elapsed) / total));
}

async function listActiveAuctions(backendUrl: string): Promise<string[]> {
  const payload = await fetchJson<{ items?: BackendAuction[] }>(`${backendUrl.replace(/\\/$/, '')}/api/auctions?status=active&limit=200`);
  const items = payload?.items ?? [];
  return items.map((i) => i.auctionId).filter(Boolean);
}

export async function runAuctionMonitor(config: {
  botPrivateKey: string;
  auctionProgramId: string;
  aleoRpcUrl: string;
  network: string;
  backendUrl: string;
  contractsAuctionCwd: string;
}): Promise<void> {
  const height = await tryGetLatestBlockHeight(config.aleoRpcUrl, config.network);
  if (!height) {
    console.warn('Could not resolve latest block height; skipping tick.');
    return;
  }

  const auctionIds = await listActiveAuctions(config.backendUrl);
  for (const auctionId of auctionIds) {
    const auction = await getOnChainAuction(config.aleoRpcUrl, config.network, config.auctionProgramId, auctionId);
    if (!auction) continue;

    const isActive = auction.status === STATUS_ACTIVE;
    const isVickreyOrSealed = auction.mode === MODE_FIRST_PRICE || auction.mode === MODE_VICKREY;
    const isEnglish = auction.mode === MODE_ENGLISH;
    const isDutch = auction.mode === MODE_DUTCH;

    if (isActive && height > auction.deadline) {
      if (isVickreyOrSealed) {
        const res = await leoExecute(
          [
            'execute',
            'close_bidding',
            `${auctionId}`,
            '--private-key',
            config.botPrivateKey,
            '--network',
            config.network,
            '--endpoint',
            config.aleoRpcUrl,
            '--broadcast',
            '--yes',
          ],
          { cwd: config.contractsAuctionCwd }
        );
        console.log(`[close_bidding] ${auctionId} -> code=${res.code}`);
      } else if (isEnglish) {
        console.warn(`[settle_english] ${auctionId}: cannot auto-settle without reserve_price (private input).`);
      }
    }

    if (isDutch) {
      const params = await getDutchParams(config.aleoRpcUrl, config.network, config.auctionProgramId, auctionId);
      if (params) {
        const price = currentDutchPrice(params, auction.createdAt, auction.deadline, height);
        console.log(`[dutch] ${auctionId} current_price=${price ?? 'unknown'}`);
      }
    }

    if (auction.disputeDeadline > 0 && height > auction.disputeDeadline) {
      const dispute = await fetchText(rpcMappingUrl(config.aleoRpcUrl, config.network, config.auctionProgramId, `disputes/${encodeURIComponent(auctionId)}`));
      if (dispute) {
        console.warn(`[dispute] ${auctionId} dispute_deadline passed at ${auction.disputeDeadline}; admin must resolve.`);
      }
    }
  }
}
