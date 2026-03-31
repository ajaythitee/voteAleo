import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/api/health', (_req, res) => {
  const mongo =
    mongoose.connection.readyState === 1
      ? 'connected'
      : mongoose.connection.readyState === 2
        ? 'connecting'
        : 'disconnected';
  res.json({ status: 'ok', mongo });
});

