## VeilProtocol

[![Aleo Testnet](https://img.shields.io/badge/network-aleo%20testnet-6f42c1)](https://developer.aleo.org/)
[![Contracts](https://img.shields.io/badge/contracts-leo-blue)](./contracts)
[![Frontend](https://img.shields.io/badge/frontend-next.js%2014-black)](./frontend)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Privacy‑preserving governance & marketplace on the Aleo blockchain:

- **Private voting** (anonymous ballots, anti‑double‑voting, hidden tallies until end)
- **First‑price sealed‑bid auctions** (private / public / mixed bids)
- **Next.js frontend** with wallet support and **gasless UX** via a relayer

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

## Folder structure (high level)

```text
voteAleo/
  contracts/
    vote/          # Voting Leo program (vote_privacy_8000.aleo)
    auction/       # Auction Leo program (privote_auction_5000.aleo)
  frontend/        # Next.js app (UI + relayer APIs)
  README.md        # Project overview (this file)
```

---

## Prerequisites

- **Node.js** (for the frontend)
- **Leo CLI 3.4.0+** (for building/deploying the Leo contracts)  
  See: `https://developer.aleo.org/leo/installation`
- A funded Aleo **testnet** account (for contract deployment & relayer)

---

## Basic commands

- **Run frontend in dev mode**

  ```bash
  cd frontend
  npm install
  npm run dev
  ```

- **Build a contract (example: vote)**

  ```bash
  cd contracts/vote
  leo build
  ```

- **Deploy a contract (example: vote, testnet)**

  ```bash
  leo deploy \
    --private-key "<YOUR_PRIVATE_KEY>" \
    --network "testnet" \
    --endpoint "https://api.explorer.provable.com/v1" \
    --broadcast \
    --yes
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
