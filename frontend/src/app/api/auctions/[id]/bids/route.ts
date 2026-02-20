// Bids for an auction - returns empty array; creator uses bid_count + highest_bid from chain
// and enters winning bid ID manually (highest bidder shares it)
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return NextResponse.json({ bids: [] });
}
