# Privote Auction

First-price sealed-bid auction contract on the Aleo blockchain. Part of the Privote platform.

**Program ID:** `privote_auction_4000.aleo`

## Summary

A first-price sealed-bid auction (or blind auction) is a type of auction in which each participant submits a bid without knowing the bids of the other participants.
The bidder with the highest bid wins the auction.

In this model, there are two parties: the auctioneer and the bidders.
- **Bidder**: A participant in the auction.
- **Auctioneer**: The party responsible for conducting the auction.

We make the following assumptions about the auction:
- The auctioneer is honest. That is, the auctioneer will resolve **all** bids in the order they are received. The auctioneer will not tamper with the bids.
- There is no limit to the number of bids.
- The auctioneer knows the identity of all bidders, but bidders do not necessarily know the identity of other bidders.

Under this model, we require that:
- Bidders do not learn any information about the value of other bids.

### Auction Flow
The auction is conducted in a series of stages.
- **Bidding**: In the bidding stage, bidders submit bids to the auctioneer. They do so by invoking the `place_bid` function.
- **Resolution**:  In the resolution stage, the auctioneer resolves the bids in the order they were received. The auctioneer does so by invoking the `resolve` function. The resolution process produces a single winning bid.
- **Finishing**: In this stage, the auctioneer finishes the auction by invoking the `finish` function. This function returns the winning bid to the bidder, which the bidder can then use to claim the item.


## Language Features and Concepts
- `record` declarations
- `assert_eq`
- record ownership

## Building and Deploying

### Build Only
```bash
cd contracts/auction
leo build
```

### Deploy Both Contracts
From the repo root, the deploy script builds and deploys both the voting and auction contracts:
```bash
cd contracts
./deploy.sh
```

This will deploy:
- **Voting Contract:** `vote_privacy_6723.aleo`
- **Auction Contract:** `privote_auction_4000.aleo`

### Manual Deploy
```bash
cd contracts/auction
leo build
leo deploy --private-key <YOUR_KEY> --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --yes
```

## Configuration

The deployment script uses environment variables:
- `PRIVATE_KEY`: Your Aleo private key (defaults to a test key if not set)
- `NETWORK`: `testnet` or `mainnet` (defaults to `testnet`)
- `ENDPOINT`: RPC endpoint URL

When executing programs as different parties (auctioneer vs bidder), ensure the `PRIVATE_KEY` in your `.env` matches the intended account.

The [Aleo SDK](https://github.com/ProvableHQ/leo/tree/mainnet) provides an interface for generating new accounts. To generate a new account, navigate to [provable.tools](https://provable.tools).
