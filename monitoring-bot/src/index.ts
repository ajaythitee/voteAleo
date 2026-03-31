import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAuctionMonitor } from './auctionMonitor.js';

const BOT_PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || '';
const AUCTION_PROGRAM_ID = process.env.AUCTION_PROGRAM_ID || '';
const ALEO_RPC_URL = process.env.ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const NETWORK = process.env.NETWORK || 'testnet';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

if (!BOT_PRIVATE_KEY) throw new Error('Missing BOT_PRIVATE_KEY');
if (!AUCTION_PROGRAM_ID) throw new Error('Missing AUCTION_PROGRAM_ID');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsAuctionCwd = path.resolve(__dirname, '../../contracts/auction');

async function tick() {
  await runAuctionMonitor({
    botPrivateKey: BOT_PRIVATE_KEY,
    auctionProgramId: AUCTION_PROGRAM_ID,
    aleoRpcUrl: ALEO_RPC_URL,
    network: NETWORK,
    backendUrl: BACKEND_URL,
    contractsAuctionCwd,
  });
}

void tick();
setInterval(() => void tick(), 60_000);

