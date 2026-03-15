import { NextRequest, NextResponse } from 'next/server';

const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID;
const RPC_URL = process.env.NEXT_PUBLIC_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const NETWORK = process.env.NEXT_PUBLIC_ALEO_NETWORK || 'testnet';

export const dynamic = 'force-dynamic';

function rpcUrl(path: string): string {
  return `${RPC_URL}/${NETWORK}/program/${AUCTION_PROGRAM_ID}/mapping/${path}`;
}

async function readMapping(path: string) {
  const response = await fetch(rpcUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  return response.text();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auctionId = decodeURIComponent(id);

  if (!AUCTION_PROGRAM_ID) {
    return NextResponse.json(
      {
        bids: [],
        summary: {
          available: false,
          reason: 'Auction program ID is not configured.',
        },
      },
      { status: 500 }
    );
  }

  try {
    const encoded = encodeURIComponent(auctionId);
    const [bidCountRaw, highestBidRaw, winningBidRaw, redeemedRaw] = await Promise.all([
      readMapping(`bid_count/${encoded}`),
      readMapping(`highest_bids/${encoded}`),
      readMapping(`winning_bids/${encoded}`),
      readMapping(`redemptions/${encoded}`),
    ]);

    const bidCount = Number(bidCountRaw?.match(/(\d+)/)?.[1] ?? '0');
    const highestBid = Number(highestBidRaw?.match(/(\d+)/)?.[1] ?? '0');
    const winningBidId = winningBidRaw?.trim() || null;
    const isRedeemed = redeemedRaw?.trim().toLowerCase() === 'true';

    return NextResponse.json({
      bids: [],
      summary: {
        available: true,
        mode: 'on-chain-summary',
        auctionId,
        bidCount,
        highestBid,
        winningBidId,
        isRedeemed,
        note: 'Public bid history is not fully indexed yet. This endpoint returns a chain-backed summary only, and creators still need the winning public bid ID from the bidder record.',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        bids: [],
        summary: {
          available: false,
          reason: error instanceof Error ? error.message : 'Failed to load auction summary.',
        },
      },
      { status: 500 }
    );
  }
}
