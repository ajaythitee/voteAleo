import { Router } from 'express';
import { Bid } from '../models/Bid.js';
import type { CreateBidPayload } from '../types.js';

export const bidsRouter = Router();

bidsRouter.post('/api/auctions/:id/bids', async (req, res) => {
  const auctionId = decodeURIComponent(req.params.id);
  const payload = req.body as CreateBidPayload;
  if (!payload?.bidderAddress || !payload?.bidNonce || !payload?.commitmentHash || !payload?.tokenType) {
    return res.status(400).json({ error: 'bidderAddress, bidNonce, commitmentHash, tokenType are required' });
  }

  const created = await Bid.create({
    auctionId,
    bidderAddress: payload.bidderAddress,
    bidNonce: payload.bidNonce,
    commitmentHash: payload.commitmentHash,
    tokenType: payload.tokenType,
    revealed: false,
  });

  return res.json({ item: created.toObject() });
});

bidsRouter.get('/api/auctions/:id/bids', async (req, res) => {
  const auctionId = decodeURIComponent(req.params.id);
  const items = await Bid.find({ auctionId }).sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ items });
});

