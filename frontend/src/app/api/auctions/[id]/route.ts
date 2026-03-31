import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const AuctionMetaSchema = new mongoose.Schema(
  {
    auctionId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    strategy: { type: String, enum: ['first_price', 'vickrey', 'dutch', 'english'], default: 'first_price' },
    tokenType: { type: String, enum: ['aleo', 'usdcx', 'usad'], default: 'aleo' },
    creatorAddress: { type: String, default: '' },
    originalDeadline: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AuctionMeta =
  (mongoose.models.AuctionMeta as mongoose.Model<any>) ||
  mongoose.model('AuctionMeta', AuctionMetaSchema);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const auctionId = decodeURIComponent(id);
    const item = await AuctionMeta.findOne({ auctionId }).lean();
    if (!item) {
      return NextResponse.json({ item: null }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load metadata' },
      { status: 500 }
    );
  }
}
