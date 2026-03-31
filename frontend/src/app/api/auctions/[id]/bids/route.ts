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
    const [auctionRaw, secondBidRaw, highestBidRaw, winningBidRaw, settlementRaw] = await Promise.all([
      readMapping(`auctions/${encoded}`),
      readMapping(`second_highest_bids/${encoded}`),
      readMapping(`highest_bids/${encoded}`),
      readMapping(`auction_winners/${encoded}`),
      readMapping(`settlements/${encoded}`),
    ]);

    const bidCount = Number(auctionRaw?.match(/bid_count\s*:\s*(\d+)/i)?.[1] ?? '0');
    const highestBid = Number(highestBidRaw?.match(/(\d+)/)?.[1] ?? '0');
    const secondHighestBid = Number(secondBidRaw?.match(/(\d+)/)?.[1] ?? '0');
    const winningBidId = winningBidRaw?.trim() || null;
    const isSettled = !!settlementRaw;

    return NextResponse.json({
      bids: [],
      summary: {
        available: true,
        mode: 'on-chain-summary',
        auctionId,
        bidCount,
        highestBid,
        secondHighestBid,
        winningBidId,
        isSettled,
        note: 'Public bid history is not fully indexed yet. This endpoint returns a chain-backed summary for the Veil auction mappings.',
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
