import { NextRequest, NextResponse } from 'next/server';
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

export async function GET() {
  try {
    await connectMongo();
    const rows = await AuctionMeta.find({}).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json(
      { items: [], error: error instanceof Error ? error.message : 'Failed to load metadata' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    const auctionId = String(body.auctionId || '').trim();
    if (!auctionId) {
      return NextResponse.json({ error: 'auctionId is required' }, { status: 400 });
    }

    const payload = {
      auctionId,
      name: String(body.name || 'Untitled auction'),
      description: String(body.description || ''),
      imageUrl: String(body.imageUrl || ''),
      strategy: body.strategy === 'vickrey' || body.strategy === 'dutch' || body.strategy === 'english' ? body.strategy : 'first_price',
      tokenType: body.tokenType === 'usdcx' || body.tokenType === 'usad' ? body.tokenType : 'aleo',
      creatorAddress: String(body.creatorAddress || ''),
      originalDeadline: Number(body.originalDeadline || 0),
    };

    const doc = await AuctionMeta.findOneAndUpdate({ auctionId }, payload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();

    return NextResponse.json({ item: doc });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save metadata' },
      { status: 500 }
    );
  }
}
