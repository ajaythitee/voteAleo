import { Router } from 'express';
import { Auction } from '../models/Auction.js';
import type { CreateOrUpdateAuctionPayload } from '../types.js';

export const auctionsRouter = Router();

auctionsRouter.post('/api/auctions', async (req, res) => {
  const payload = req.body as CreateOrUpdateAuctionPayload;
  if (!payload?.auctionId || !payload?.name) {
    return res.status(400).json({ error: 'auctionId and name are required' });
  }

  const update: Partial<CreateOrUpdateAuctionPayload> = {
    auctionId: payload.auctionId,
    name: payload.name,
    description: payload.description ?? '',
    imageUrl: payload.imageUrl ?? '',
    strategy: payload.strategy,
    tokenType: payload.tokenType,
    creatorAddress: payload.creatorAddress ?? '',
    originalDeadline: payload.originalDeadline ?? 0,
  };

  const doc = await Auction.findOneAndUpdate(
    { auctionId: payload.auctionId },
    { $set: update, $setOnInsert: { status: 'UNKNOWN', bidCount: 0, deadline: 0, mode: 0 } },
    { upsert: true, new: true }
  ).lean();

  return res.json({ item: doc });
});

auctionsRouter.get('/api/auctions', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Auction.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Auction.countDocuments(filter),
  ]);

  return res.json({ items, page, limit, total });
});

auctionsRouter.get('/api/auctions/:id', async (req, res) => {
  const auctionId = decodeURIComponent(req.params.id);
  const item = await Auction.findOne({ auctionId }).lean();
  if (!item) return res.status(404).json({ item: null });
  return res.json({ item });
});

auctionsRouter.put('/api/auctions/:id', async (req, res) => {
  const auctionId = decodeURIComponent(req.params.id);
  const patch = req.body as Partial<CreateOrUpdateAuctionPayload>;
  const item = await Auction.findOneAndUpdate(
    { auctionId },
    {
      $set: {
        ...(patch.name != null ? { name: patch.name } : {}),
        ...(patch.description != null ? { description: patch.description } : {}),
        ...(patch.imageUrl != null ? { imageUrl: patch.imageUrl } : {}),
        ...(patch.strategy != null ? { strategy: patch.strategy } : {}),
        ...(patch.tokenType != null ? { tokenType: patch.tokenType } : {}),
        ...(patch.creatorAddress != null ? { creatorAddress: patch.creatorAddress } : {}),
        ...(patch.originalDeadline != null ? { originalDeadline: patch.originalDeadline } : {}),
      },
    },
    { new: true }
  ).lean();

  if (!item) return res.status(404).json({ item: null });
  return res.json({ item });
});

