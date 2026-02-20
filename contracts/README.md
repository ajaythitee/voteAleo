## Contracts

This folder contains the Leo smart contracts for VeilProtocol on Aleo testnet.

- **`vote`** – voting program `vote_privacy_8000.aleo`
- **`auction`** – auction program `privote_auction_5000.aleo`

Both programs are designed to be:

- **Config‑driven**: program IDs are not hard‑coded in the frontend; they are injected via env vars.
- **Composable**: the frontend and relayer call public transitions only; all internal structs/mappings stay encapsulated.

### Deployment

You can deploy each contract individually from its folder:

```bash
cd contracts/vote
leo build
leo deploy --private-key "<YOUR_PRIVATE_KEY>" --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --yes

cd ../auction
leo build
leo deploy --private-key "<YOUR_PRIVATE_KEY>" --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --yes
```

Or use the helper script from `contracts`:

```bash
VOTING_PROGRAM_ID="vote_privacy_8000.aleo" \
AUCTION_PROGRAM_ID="privote_auction_5000.aleo" \
PRIVATE_KEY="<YOUR_PRIVATE_KEY>" \
./deploy.sh
```

