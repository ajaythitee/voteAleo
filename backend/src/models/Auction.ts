import mongoose from 'mongoose';
import type { AuctionStrategy, AuctionTokenType, AuctionStatus } from '../types.js';

export interface AuctionDoc {
  auctionId: string;
  name: string;
  description: string;
  imageUrl: string;
  strategy: AuctionStrategy;
  tokenType: AuctionTokenType;
  creatorAddress: string;
  originalDeadline: number;
  status: AuctionStatus;
  mode: number;
  bidCount: number;
  deadline: number;
  createdAt: Date;
  updatedAt: Date;
}

const AuctionSchema = new mongoose.Schema<AuctionDoc>(
  {
    auctionId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    strategy: { type: String, enum: ['first_price', 'vickrey', 'dutch', 'english'], default: 'first_price' },
    tokenType: { type: String, enum: ['aleo', 'usdcx', 'usad'], default: 'aleo' },
    creatorAddress: { type: String, default: '' },
    originalDeadline: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'CLOSED', 'REVEALING', 'SETTLED', 'CANCELLED', 'FAILED', 'DISPUTED', 'EXPIRED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    mode: { type: Number, default: 0 },
    bidCount: { type: Number, default: 0 },
    deadline: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Auction =
  (mongoose.models.Auction as mongoose.Model<AuctionDoc>) ||
  mongoose.model<AuctionDoc>('Auction', AuctionSchema);

