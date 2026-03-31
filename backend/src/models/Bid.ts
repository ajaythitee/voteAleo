import mongoose from 'mongoose';

export interface BidDoc {
  auctionId: string;
  bidderAddress: string;
  bidNonce: string;
  commitmentHash: string;
  tokenType: string;
  revealed: boolean;
  createdAt: Date;
}

const BidSchema = new mongoose.Schema<BidDoc>(
  {
    auctionId: { type: String, required: true, index: true },
    bidderAddress: { type: String, required: true },
    bidNonce: { type: String, required: true },
    commitmentHash: { type: String, required: true },
    tokenType: { type: String, required: true },
    revealed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Bid =
  (mongoose.models.Bid as mongoose.Model<BidDoc>) ||
  mongoose.model<BidDoc>('Bid', BidSchema);

