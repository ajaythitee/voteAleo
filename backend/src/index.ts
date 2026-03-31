import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectMongo } from './db.js';
import { auctionsRouter } from './routes/auctions.js';
import { bidsRouter } from './routes/bids.js';
import { healthRouter } from './routes/health.js';
import { startIndexer } from './services/indexer.js';

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || '';
const ALEO_RPC_URL = process.env.ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const AUCTION_PROGRAM_ID = process.env.AUCTION_PROGRAM_ID || '';
const NETWORK = process.env.NETWORK || 'testnet';

async function main() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }
  if (!AUCTION_PROGRAM_ID) {
    throw new Error('Missing AUCTION_PROGRAM_ID');
  }

  await connectMongo(MONGODB_URI);

  const app = express();
  app.use(cors());
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(healthRouter);
  app.use(auctionsRouter);
  app.use(bidsRouter);

  startIndexer({
    intervalMs: 30_000,
    aleoRpcUrl: ALEO_RPC_URL,
    network: NETWORK,
    programId: AUCTION_PROGRAM_ID,
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`backend listening on :${PORT}`);
  });
}

void main();

