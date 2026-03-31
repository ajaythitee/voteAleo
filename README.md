# :sunglasses: Veil Protocol (voteAleo)

[![Aleo Testnet](https://img.shields.io/badge/network-aleo%20testnet-6f42c1)](https://developer.aleo.org/)
[![Contracts](https://img.shields.io/badge/contracts-leo-blue)](./contracts)
[![Frontend](https://img.shields.io/badge/frontend-next.js-black)](./frontend)

Privacy-preserving **Voting + Auctions + Marketplace** on Aleo.

- :ballot_box_with_ballot: **Vote**: create campaigns, cast votes, prevent double-voting, verify participation
- :lock: **Auction**: sealed-bid + English/Dutch strategies, dispute + cancel flows, selective disclosure proofs
- :shopping_cart: **Market**: fixed-price listings + RFQs + royalties (Leo contract)
- :brain: **Backend**: Express + MongoDB metadata + indexer mirroring on-chain state
- :robot: **Monitoring bot**: polls auctions and triggers automation where possible
- :jigsaw: **SDK**: shared TypeScript utilities used by the frontend and bot

See `ARCHITECTURE.MD` for the system diagram and component breakdown.

---

## :file_folder: Repo layout

```text
contracts/
  vote/             # Voting contract (Leo)
  auction/           # Auction contract (Leo)
  market/            # Marketplace contract (Leo)
frontend/            # Next.js app (UI)
backend/             # Express + MongoDB + on-chain indexer
monitoring-bot/      # Node/TS monitoring + automation loop
sdk/                 # @veil/sdk (pure TypeScript)
_reference/          # Reference implementations (do not deploy from here)
```

---

## :white_check_mark: Quickstart (local)

### 1) Backend (metadata + indexer)

```bash
cd backend
# copy backend/.env.example -> backend/.env and fill values
npm install
npm run build
npm run start
```

Key endpoints:
- `GET /api/health`
- `GET /api/auctions?page=&limit=&status=`
- `POST /api/auctions` (create/update metadata)
- `GET /api/auctions/:id`
- `PUT /api/auctions/:id`
- `POST /api/auctions/:id/bids`
- `GET /api/auctions/:id/bids`

Indexer:
- runs every **30s**
- reads on-chain mappings (`auction_counter`, `public_auction_index`, `auctions`)
- upserts parsed `status`, `mode`, `token_type`, `bid_count`, `deadline` into MongoDB

### 2) Frontend

```bash
cd frontend
# copy frontend/.env.example -> frontend/.env.local and fill values
npm install
npm run dev
```

Frontend data sources:
- on-chain state: read directly from Aleo RPC mappings
- off-chain metadata: read/write via the backend (`NEXT_PUBLIC_BACKEND_URL`)

---

## :scroll: Environment variables

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_ALEO_NETWORK`
- `NEXT_PUBLIC_ALEO_RPC_URL`
- `NEXT_PUBLIC_VOTING_PROGRAM_ID`
- `NEXT_PUBLIC_AUCTION_PROGRAM_ID`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_PINATA_JWT` (optional)
- `NEXT_PUBLIC_PINATA_GATEWAY` (optional)

### Backend (`backend/.env`)
- `MONGODB_URI`
- `PORT`
- `ALEO_RPC_URL`
- `AUCTION_PROGRAM_ID`
- `NETWORK`
- `PINATA_JWT` (optional)

### Monitoring bot (`monitoring-bot/.env`)
- `BOT_PRIVATE_KEY`
- `AUCTION_PROGRAM_ID`
- `ALEO_RPC_URL`
- `NETWORK`
- `BACKEND_URL`

---

## :ballot_box_with_ballot: Voting contract (`contracts/vote`)

Capabilities:
- create campaigns (metadata references)
- cast votes
- prevent double-voting via on-chain mappings
- verify participation (proof of vote)

Build:
```bash
cd contracts/vote
leo build
```

---

## :lock: Auction contract (`contracts/auction`)

Capabilities:
- create auctions (including `create_auction_with_duration`)
- bid / reveal / close / finalize
- cancel auction (only when ACTIVE and `bid_count == 0`)
- dispute auction + admin resolution
- prove a win using a `WinnerCertificate` without revealing the bid amount (`prove_won_auction`)
- withdraw platform fees for ALEO and USDCx treasuries

Build:
```bash
cd contracts/auction
leo build
```

### :warning: Deploy troubleshooting (Aleo consensus upgrades)

If you see errors similar to:
- `expected ... verifying keys after ConsensusVersion::V14`

Try:
- upgrade Leo CLI to a version compatible with the current network consensus
- run a clean rebuild (`leo clean` if available, then `leo build`)
- redeploy with the upgraded toolchain

---

## :shopping_cart: Marketplace contract (`contracts/market`)

Build:
```bash
cd contracts/market
leo build
```

---

## :robot: Monitoring bot (`monitoring-bot/`)

Runs every **60s**:
- fetches latest block height
- reads active auctions from backend (`/api/auctions?status=active`)
- for sealed / vickrey style auctions: submits `close_bidding` when `height > deadline`
- for dutch auctions: logs current price
- dispute checks: alerts when `height > dispute_deadline`

Note: English auctions typically require private inputs (e.g. reserve price), so the bot may not be able to auto-settle them without additional off-chain configuration.

---

## :jigsaw: SDK (`sdk/`)

`@veil/sdk` is a pure TypeScript package shared by:
- frontend (transaction builders, parser helpers)
- monitoring bot (shared constants + parsing)

