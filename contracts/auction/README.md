## Privote Auction Contract – `privote_auction_5000.aleo`

First‑price sealed‑bid auction contract for Aleo testnet. Supports **private**, **public**, and **mixed** bidding with on‑chain discovery for the frontend.

---

### Program metadata

- **Program id**: `privote_auction_5000.aleo`
- **Depends on**: `credits.aleo` (for transfers and redemption)
- **Key data types**
  - `auction` – item + starting bid + name
  - `item` – unique id + off‑chain data pointer
  - `privacy_settings` – auction privacy + bid types accepted
  - `bid` – amount + auction id + bid public key
  - `AuctionTicket` – record representing an open auction (owned by auctioneer)
  - `AuctionInvite` – record representing a private invite to an auction
  - `BidReceipt` – record the bidder keeps as proof of their bid
  - `PrivateBid` – record holding a private bid for the auctioneer

---

### Storage layout (mappings)

Public mappings:

- `auctions: u64 => field`  
  Reserved / legacy mapping for indexing auctions.
- `bid_count: field => u64`  
  Number of bids for a given `auction_id`.
- `auction_public_keys: field => group`  
  On‑chain registry that tells you whether an auction exists (and stores its public key).
- `winning_bids: field => field`  
  Maps `auction_id` → `bid_id` for the winner.
- `public_auctions: field => auction`  
  Human‑readable auction data for **public** auctions.
- `auction_owners: field => address`  
  Auction owner (auctioneer) for a given `auction_id`.
- `auction_privacy_settings: field => privacy_settings`  
  Stores whether bids must be private, public, or mixed.
- `highest_bids: field => u64`  
  Tracks current highest bid per `auction_id`.
- `redemptions: field => bool`  
  Tracks whether a given `auction_id` has been redeemed.
- `auction_counter: u8 => u64`  
  Global counter used for indexing public auctions in a list.
- `public_auction_index: u64 => field`  
  Maps sequential index (1..N) → `auction_id` for frontend listing.
- `public_bids: field => bid`  
  Stores public bids by `bid_id`.
- `public_bid_owners: field => address`  
  Optional mapping from `bid_id` → public bidder address.

These mappings are what the **frontend** calls via Aleo RPC to:

- List public auctions (`auction_counter` + `public_auction_index` + `public_auctions`)
- Display owner addresses (`auction_owners`)
- Inspect highest bids and winning bids (`highest_bids`, `winning_bids`)

---

### Auction lifecycle (high level)

- **Create private auction**
  - Auctioneer creates an `AuctionTicket` with hidden auction data.
  - Auction is marked as existing in `auction_public_keys`.
  - Used when you want bids and auction details to remain private initially.

- **Create public auction**
  - Auction data and (optionally) auctioneer address are written to:
    - `public_auctions`
    - `auction_owners`
    - `auction_privacy_settings`
  - Auction is indexed via `auction_counter` + `public_auction_index` so the frontend can list it.

- **Public bidding**
  - Bids are stored in `public_bids`, counts in `bid_count`, and the current best price in `highest_bids`.
  - Optionally, bidder addresses are stored in `public_bid_owners`.

- **Private bidding**
  - Bid details live only in private records (`BidReceipt`, `PrivateBid`).
  - Only aggregate info (like `bid_count` and `highest_bids`) surfaces in public mappings.

- **Selecting a winner**
  - For public bids: the contract checks that the provided `bid` matches what’s in `public_bids`, and that its amount equals `highest_bids[auction_id]`.
  - For private bids: the contract checks the private bid amount equals the tracked `highest_bids[auction_id]`.
  - The winning bid id is stored in `winning_bids[auction_id]`.

- **Redeeming the winning bid**
  - Several flows exist (public, private‑to‑public, fully private) but all:
    - Ensure the caller is the auction owner (when applicable).
    - Ensure the provided bid is the stored winner.
    - Ensure the auction has not already been redeemed.
    - Mark `redemptions[auction_id] = true` after successful payment.

### How the frontend uses this contract

- Reads public mappings via Aleo RPC using `NEXT_PUBLIC_AUCTION_PROGRAM_ID` to:
  - List public auctions.
  - Show auction owners and public data.
  - Optionally show highest bids and winning status.
- Uses an SDK/wallet layer to call transitions for:
  - Creating auctions.
  - Placing bids.
  - Selecting winners and redeeming payments.

