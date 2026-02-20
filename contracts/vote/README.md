## Voting Contract – `vote_privacy_8000.aleo`

Privacy‑preserving voting contract for Privote. It manages campaign metadata, on‑chain tallies, and anti‑double‑voting while keeping voter identities private.

---

### Program metadata

- **Program id**: `vote_privacy_8000.aleo`
- **Key structs**
  - `IpfsCid` – splits an IPFS CID into two `field` parts.
  - `Campaign` – stores creator, metadata CID, time window, vote counts, and status.
  - `VoteReceipt` – private record held by the voter as proof they voted.

---

### Storage layout (mappings)

Public mappings:

- `campaign_counter: u8 => u64`  
  Singleton counter for generating incremental campaign IDs. Index `0u8` holds the current counter.

- `campaigns: u64 => Campaign`  
  Stores the **public** state of each campaign by numeric `campaign_id`.

- `has_voted: field => bool`  
  Stores whether a voter has already voted in a given campaign.  
  The key is:
  \[
    voted\_key = \text{BHP256::hash\_to\_field}(campaign\_id + voter\_hash)
  \]

This layout allows:

- Anyone to query how many campaigns exist (`campaign_counter`).
- Anyone to read non‑sensitive campaign metadata and tallies (`campaigns`).
- Double‑voting prevention without exposing raw voter addresses (`has_voted` uses a hash key).

---

### Constructor

```leo
@noupgrade
async constructor() {}
```

The constructor is minimal and exists to satisfy Leo 3.4.0+ requirements. The program’s behavior is entirely driven by transitions.

---

### Campaign lifecycle

#### 1. Creating a campaign – `create_campaign`

```leo
async transition create_campaign(
    public cid_part1: field,
    public cid_part2: field,
    public start_time: u64,
    public end_time: u64,
    public option_count: u8,
) -> Future
```

Inputs:

- `cid_part1`, `cid_part2` – encoded IPFS CID for campaign metadata (title, description, options).
- `start_time`, `end_time` – Unix timestamps (in seconds).
- `option_count` – number of options (2–4).

Flow:

1. Validates:
   - `end_time > start_time`
   - `2 <= option_count <= 4`
2. Calls `finalize_create_campaign` with:
   - `creator = self.caller`
   - CID parts and timing data
   - `option_count`

#### 2. Finalizing campaign creation – `finalize_create_campaign`

```leo
async function finalize_create_campaign(
    creator: address,
    cid_part1: field,
    cid_part2: field,
    start_time: u64,
    end_time: u64,
    option_count: u8,
)
```

Flow:

1. Reads the current counter:
   - `current_counter = Mapping::get_or_use(campaign_counter, 0u8, 0u64)`
2. Computes `campaign_id = current_counter + 1`.
3. Updates `campaign_counter[0u8] = campaign_id`.
4. Builds `IpfsCid` from the two parts.
5. Constructs a `Campaign` with:
   - `creator`, `metadata_cid`, `start_time`, `end_time`
   - `option_count`, `total_votes = 0`, `is_active = true`
   - All vote counts initialized to `0`.
6. Writes `campaigns[campaign_id] = campaign`.

Result:

- Each new campaign gets a unique incremental `campaign_id`.
- All core metadata is public and queryable via Aleo RPC.

---

### Voting

#### 1. Casting a vote – `cast_vote`

```leo
async transition cast_vote(
    public campaign_id: u64,
    public option_index: u8,
    private timestamp: u64,
) -> (VoteReceipt, Future)
```

Inputs:

- `campaign_id` – numeric ID of the campaign.
- `option_index` – index of selected option (0–3).
- `timestamp` – a private timestamp the voter stores in their receipt.

Flow:

1. Validates `option_index < 4` (hard upper bound).
2. Builds a private `VoteReceipt`:
   - `owner = self.caller`
   - `campaign_id`, `option_index`, and `timestamp`.
3. Returns the receipt **plus** a future:
   - `finalize_cast_vote(campaign_id, option_index, BHP256::hash_to_field(self.caller))`

The receipt is a **private record** the voter can later use to prove participation.

#### 2. Finalizing the vote – `finalize_cast_vote`

```leo
async function finalize_cast_vote(
    campaign_id: u64,
    option_index: u8,
    voter_hash: field,
)
```

Flow:

1. Loads the current `Campaign` from `campaigns[campaign_id]`.
2. Asserts:
   - `campaign.is_active == true`
   - `option_index < campaign.option_count`
3. Computes a privacy‑preserving vote key:

```leo
let voted_key: field = BHP256::hash_to_field(campaign_id as field + voter_hash);
let already_voted: bool = Mapping::get_or_use(has_voted, voted_key, false);
assert(!already_voted);
```

4. Writes `has_voted[voted_key] = true` to block double‑votes.
5. Calls `apply_vote_tally(campaign, option_index)` to:
   - Increment total votes
   - Increment the specific `votes_0..votes_3` bucket for the option
6. Writes the updated campaign back to `campaigns[campaign_id]`.

Result:

- The public `campaigns` mapping exposes:
  - `total_votes`
  - Per‑option vote counts (`votes_0..votes_3`)
- Double voting is prevented without exposing raw voter identities.

---

### Ending a campaign

#### `end_campaign`

```leo
async transition end_campaign(
    public campaign_id: u64,
) -> Future
```

Flow:

1. Returns a future to `finalize_end_campaign(campaign_id, self.caller)`.

#### `finalize_end_campaign`

```leo
async function finalize_end_campaign(
    campaign_id: u64,
    caller: address,
)
```

Flow:

1. Loads `campaign = campaigns[campaign_id]`.
2. Asserts `campaign.creator == caller` – only the creator can end their campaign.
3. Writes a new `Campaign` value with:
   - `is_active = false`
   - All other fields unchanged.

Result:

- Campaign becomes inactive but all tallies remain visible.

---

### Proving participation

#### `verify_vote_participation`

```leo
transition verify_vote_participation(
    receipt: VoteReceipt,
) -> bool
```

This transition simply returns `true` if the provided `VoteReceipt` is well‑formed. The receipt itself is the proof that the voter had a valid vote executed by the program.

Potential future extensions:

- Ensure the receipt’s `campaign_id` is valid and the campaign exists.
- Combine with nullifier / Merkle proofs for more complex privacy schemes.

---

### How the frontend and relayer use this contract

#### Frontend

The frontend uses `NEXT_PUBLIC_VOTING_PROGRAM_ID` to talk to Aleo RPC:

- To **read campaigns**:
  - `campaign_counter[0u8]` to get the highest `campaign_id`.
  - `campaigns[id]` to fetch campaign metadata and tallies.
- To **display results**:
  - `total_votes` and `votes_0..votes_3` per campaign.

The frontend never manages private records directly; it delegates transaction creation to the relayer.

#### Relayer (backend)

The Next.js API routes:

- `/api/relay/create-campaign`
- `/api/relay/vote`

use `@provablehq/sdk`:

- `ProgramManager.execute` with:
  - `programName = NEXT_PUBLIC_VOTING_PROGRAM_ID` (e.g. `vote_privacy_8000.aleo`)
  - `functionName = "create_campaign"` or `"cast_vote"`
  - Properly formatted inputs (`field`, `u64`, `u8` with suffixes)

This means:

- Users do not need to hold Aleo credits to create campaigns or vote.
- The relayer account pays the fees using `RELAYER_PRIVATE_KEY`.

---

### Changing the program id

If you need a fresh deployment:

1. Update `program` line in `src/main.leo`:

```leo
program vote_privacy_9000.aleo {
```

2. Update `"program"` in `program.json`.
3. Rebuild and deploy with `leo build` and `leo deploy`.
4. Update `NEXT_PUBLIC_VOTING_PROGRAM_ID` in the frontend `.env` to the new program id.

