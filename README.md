# VoteAleo

Privacy-preserving voting platform on the Aleo blockchain. Leo smart contract plus Next.js frontend with Aleo/Puzzle wallet support and gasless voting via relayer.

## Project layout

- **contracts/voting_votealeo** – Leo program `vote_privacy_6723.aleo` (campaign creation, anonymous voting, relayer flows).
- **frontend** – Next.js 14 app (TypeScript, Tailwind). Live: [vote-aleo.vercel.app](https://vote-aleo.vercel.app/).

## Prerequisites

- [Node.js](https://nodejs.org/) (for frontend)
- [Leo CLI](https://developer.aleo.org/leo/installation) (for building/deploying the contract)

## Quick start

### 1. Build and deploy the contract (optional)

From the repo root, using a bash-compatible shell (e.g. WSL or Git Bash on Windows):

```bash
cd contracts
./deploy.sh
```

Or manually:

```bash
cd contracts/voting_votealeo
leo build
leo deploy --private-key <YOUR_KEY> --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --yes
```

After deploy, set `NEXT_PUBLIC_VOTING_PROGRAM_ID` in the frontend env to the program ID (e.g. `vote_privacy_6723.aleo` or the ID printed by `leo deploy`).

### 2. Run the frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and set the variables (see frontend/.env.example for the list)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

All required variables are documented in **frontend/.env.example**. Copy it to `frontend/.env.local` and fill in:

- Aleo program ID, network, and RPC URL
- Relayer URL (use `/api/relay` for the built-in API)
- Pinata JWT and gateway (for IPFS campaign metadata)
- `RELAYER_PRIVATE_KEY` (server-only) for gasless vote/campaign creation

## Scripts

| Location   | Command        | Description                |
|-----------|----------------|----------------------------|
| frontend  | `npm run dev`  | Start Next.js dev server   |
| frontend  | `npm run build`| Production build           |
| frontend  | `npm run start`| Start production server    |
| contracts | `./deploy.sh`  | Build and deploy Leo contract |

## Verifying contract connectivity

With the frontend running:

```bash
curl http://localhost:3000/api/health/contract
```

You should get JSON with `ok: true`, `programId`, `campaignCount`, and optionally `campaign1` when the app can reach the Aleo contract and read mappings.

Without the app (direct RPC):

- Campaign count:  
  `curl "https://api.explorer.provable.com/v1/testnet/program/vote_privacy_6723.aleo/mapping/campaign_counter/0u8"`
- One campaign (may 404 if none):  
  `curl "https://api.explorer.provable.com/v1/testnet/program/vote_privacy_6723.aleo/mapping/campaigns/1u64"`

## License

MIT
