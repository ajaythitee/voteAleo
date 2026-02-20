## Privote

Privacy‑preserving governance & marketplace on the Aleo blockchain. It combines:

- **Private voting** (anonymous ballots, anti‑double‑voting, hidden tallies until end)
- **First‑price sealed‑bid auctions** (private / public / mixed bids)
- **Next.js frontend** with Aleo/Puzzle wallet support and **gasless UX** via a relayer

---

## Project layout

- **`contracts/vote`** – Leo program `vote_privacy_8000.aleo`
  - **Features**
    - On‑chain campaign creation with IPFS metadata (title, description, options)
    - Anonymous voting using hashed voter identifiers
    - Per‑campaign anti‑double‑voting (`has_voted` mapping)
    - Bounded options (2–4) with on‑chain tallies (up to 4 choices)
    - Campaign lifecycle: create → vote → end (creator‑only)
    - Simple proof of participation (`verify_vote_participation`)
- **`contracts/auction`** – Leo program `privote_auction_5000.aleo`
  - **Features**
    - First‑price sealed‑bid auction
    - **Privacy modes**: private, public, or mixed bids
    - Private invites (`AuctionInvite`) for whitelisted bidders
    - Public auction registry + owner mapping for frontend discovery
    - Mappings for bids, highest bid, winning bid, and redemptions
    - Multiple redemption flows (public, private‑to‑public, fully private) via `credits.aleo`
- **`frontend`** – Next.js 14 app (TypeScript, Tailwind)
  - Campaign creation & voting UI
  - Gasless flows using a server‑side relayer (`/api/relay/*`)
  - Auction listing via on‑chain mappings (using `auctionService`)

---

## Core features

- **Privacy‑preserving voting**
  - Voters interact with campaigns identified by IPFS metadata CIDs.
  - Votes are recorded as private records; public tallies are stored on‑chain per option.
  - Double‑voting is prevented via a hashed `(campaign_id + voter_hash)` key.

- **Gasless UX via relayer**
  - The Next.js backend signs & submits Aleo transactions using `RELAYER_PRIVATE_KEY`.
  - Frontend users don’t need balance to:
    - **Create campaigns** (`create_campaign`)
    - **Cast votes** (`cast_vote`)

- **Auctions for governance assets**
  - Auctioneer can create **private** or **public** auctions.
  - Bidders can place public or private bids depending on privacy settings.
  - Finalization transitions select the winning bid and support multiple redemption styles using `credits.aleo`.

- **Config‑driven program IDs**
  - Program IDs are **never hardcoded in the frontend**.
  - All IDs come from environment variables (`.env` / `.env.local`).

---

## Prerequisites

- **Node.js** (for the frontend)
- **Leo CLI 3.4.0+** (for building/deploying the Leo contracts)  
  See: `https://developer.aleo.org/leo/installation`
- A funded Aleo **testnet** account (for contract deployment & relayer)

---

## Deployment

### 1. Deploy the voting contract

From a bash‑compatible shell (WSL / Git Bash):

```bash
cd contracts/vote

leo build

leo deploy \
  --private-key "<YOUR_PRIVATE_KEY>" \
  --network "testnet" \
  --endpoint "https://api.explorer.provable.com/v1" \
  --broadcast \
  --yes
```

Take note of the deployed program ID (default source name is `vote_privacy_6723.aleo`).

### 2. Deploy the auction contract

```bash
cd ../auction

leo build

leo deploy \
  --private-key "<YOUR_PRIVATE_KEY>" \
  --network "testnet" \
  --endpoint "https://api.explorer.provable.com/v1" \
  --broadcast \
  --yes
```

The auction program is named `privote_auction_5000.aleo`.

### 3. (Optional) Use the combined deploy script

From the repo root:

```bash
cd contracts

VOTING_PROGRAM_ID="vote_privacy_6723.aleo" \
AUCTION_PROGRAM_ID="privote_auction_5000.aleo" \
PRIVATE_KEY="<YOUR_PRIVATE_KEY>" \
./deploy.sh
```

This script:
- Builds both programs
- Deploys to **testnet**
- Prints explorer URLs for verification

---

## Frontend setup

### 1. Configure environment variables

In `frontend`:

```bash
cd frontend
cp .env.example .env.local
```

Then edit `.env.local` and set at minimum:

- **Program configuration**
  - `NEXT_PUBLIC_VOTING_PROGRAM_ID=vote_privacy_6723.aleo` (or your deployed ID)
  - `NEXT_PUBLIC_AUCTION_PROGRAM_ID=privote_auction_5000.aleo`
  - `NEXT_PUBLIC_ALEO_NETWORK=testnet`
  - `NEXT_PUBLIC_ALEO_RPC_URL=https://api.explorer.provable.com/v1`

- **Relayer configuration**
  - `RELAYER_PRIVATE_KEY=<YOUR_PRIVATE_KEY>` (server‑only)

- **IPFS / metadata (optional but recommended)**
  - `NEXT_PUBLIC_PINATA_GATEWAY_URL=...`
  - `PINATA_JWT=...`

All variables are documented inline in `frontend/.env.example`.

### 2. Run the app

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Verifying on‑chain connectivity

### From the app

With the dev server running:

```bash
curl http://localhost:3000/api/health/contract
```

You should see JSON like:

- `ok: true`
- `programId` (voting)
- `campaignCount`

### Direct RPC checks

- **Voting campaign counter** (using the new program id; replace if you deployed a different one):

```bash
curl "https://api.explorer.provable.com/v1/testnet/program/vote_privacy_8000.aleo/mapping/campaign_counter/0u8"
```

- **First campaign (if any)**:

```bash
curl "https://api.explorer.provable.com/v1/testnet/program/vote_privacy_8000.aleo/mapping/campaigns/1u64"
```

- **Auction public key mapping** (replace `AUCTION_ID` with a field value):

```bash
curl "https://api.explorer.provable.com/v1/testnet/program/privote_auction_5000.aleo/mapping/auction_public_keys/AUCTION_ID"
```

- **Auction public data**:

```bash
curl "https://api.explorer.provable.com/v1/testnet/program/privote_auction_5000.aleo/mapping/public_auctions/AUCTION_ID"
```

---

## Roadmap / plans

- **Phase 1 (current)**
  - Core voting flows (create, vote, end)
  - Basic auction flows (create, bid, finalize, redeem)
  - Gasless UX via relayer
  - Basic campaign list & auction list UI

- **Phase 2**
  - Richer frontend for auctions (bid history, winner view)
  - Governance dashboards (per‑campaign stats, charts)
  - Better error reporting around relayer & Aleo RPC

- **Phase 3**
  - Role‑based governance (admins, proposers, voters)
  - Composable campaigns (multiple rounds, quorum rules)
  - Advanced privacy options and analytics

---

## License

MIT
