# 🐛 Common Mistakes & Fixes - ChainMeet Development

## ✅ Contracts Successfully Deployed!

**Deployed Program IDs:**
- `meeting_chainmeet_7879.aleo` ✅
- `eligibility_chainmeet_8903.aleo` ✅
- `attendance_chainmeet_1735.aleo` ✅

All three contracts are now live on Aleo Testnet!

---

## 🐛 Mistakes Made & Fixed

### 1. ❌ Wrong `program.json` Format

**Mistake:**
- Initially used TOML format: `[[package]]`
- Then tried string format: `"program_name.aleo"`
- Then tried sequence format: `[]`

**Error:**
```
Error: invalid type: sequence, expected a string at line 1 column 1
Error: invalid type: string, expected struct Manifest at line 1 column 32
```

**Fix:**
- Use JSON object format:
```json
{
  "program": "program_name.aleo",
  "version": "1.0.0",
  "description": "...",
  "license": "MIT",
  "dependencies": []
}
```

**Lesson:** Leo 3.4.0 expects `program.json` to be a JSON object with a Manifest structure, not TOML or a string.

---

### 2. ❌ Wrong Leo Project Structure

**Mistake:**
- Put all `.leo` files in one directory
- Tried to build with `leo build meeting.leo`
- Files were named `meeting.leo` instead of `main.leo`

**Error:**
```
Error: unexpected argument 'meeting.leo' found
```

**Fix:**
- Each Leo program needs its own directory
- File must be named `src/main.leo`
- Run `leo build` without filename (in contract directory)
- Structure:
```
contracts/
├── meeting_chainmeet_7879/
│   ├── program.json
│   └── src/
│       └── main.leo
```

**Lesson:** Leo requires each program in its own directory with `src/main.leo`. Run `leo build` in the directory, not `leo build file.leo`.

---

### 3. ❌ Missing Constructor

**Mistake:**
- Contracts didn't have constructors
- Leo 3.4.0 requires `@noupgrade async constructor() {}`

**Error:**
- Deployment might fail or contracts won't work properly

**Fix:**
- Added to all contracts:
```leo
@noupgrade
async constructor() {}
```

**Lesson:** Always include a constructor in Leo 3.4.0 contracts, especially for deployment.

---

### 4. ❌ Using `Mapping::get` Without Default Values

**Mistake:**
- Used `Mapping::get(mapping, key)` for counters and optional values
- This fails if the key doesn't exist

**Error:**
- Runtime errors when accessing non-existent mapping keys

**Fix:**
- Use `Mapping::get_or_use(mapping, key, default_value)` for counters:
```leo
// Counter example
let current_counter = Mapping::get_or_use(meeting_counter, 0u8, 0u64);
let meeting_id: u64 = current_counter + 1u64;
Mapping::set(meeting_counter, 0u8, meeting_id);

// Optional value example
let count = Mapping::get_or_use(meeting_attendance_count, meeting_id, 0u64);
```

- Keep `Mapping::get` for required values (where failure is expected):
```leo
// Meeting must exist - use get
let meeting = Mapping::get(meetings, meeting_id); // Will fail if doesn't exist
```

**Lesson:** Use `Mapping::get_or_use` with default values for optional/counter mappings. Use `Mapping::get` only when you expect the key to exist.

---

### 5. ❌ Missing Counters for Unique IDs

**Mistake:**
- Hardcoded IDs: `let meeting_id: u64 = 0u64;`
- All meetings had same ID (0)

**Fix:**
- Added counter mappings:
```leo
mapping meeting_counter: u8 => u64; // Singleton counter

// In function:
let current_counter = Mapping::get_or_use(meeting_counter, 0u8, 0u64);
let meeting_id: u64 = current_counter + 1u64;
Mapping::set(meeting_counter, 0u8, meeting_id);
```

**Lesson:** Always use counters for unique IDs. Never hardcode IDs to 0 or constant values.

---

### 6. ❌ Wrong Deployment Command Syntax

**Mistake:**
- Missing `--endpoint` flag
- Missing `--yes` flag
- Had to manually confirm deployments

**Error:**
```
Error: Please provide the `--endpoint` or set the `ENDPOINT` environment variable.
```

**Fix:**
- Always include all required flags:
```bash
leo deploy --private-key $PRIVATE_KEY \
  --network testnet \
  --endpoint https://api.explorer.provable.com/v1 \
  --broadcast \
  --yes
```

**Lesson:** Always specify `--endpoint` explicitly and use `--yes` for automated deployments.

---

### 7. ❌ Program Names Not Unique

**Mistake:**
- Used generic names: `meeting.aleo`, `eligibility.aleo`
- Program names must be globally unique on Aleo

**Fix:**
- Use unique suffixes: `meeting_chainmeet_7879.aleo`
- Or use random numbers: `meeting_chainmeet_XXXX.aleo`

**Lesson:** Always use unique program names. Add random numbers or project-specific suffixes.

---

### 8. ❌ Wrong Frontend SDK Package

**Mistake:**
- Used `@aleo/sdk` in `package.json`
- This package doesn't exist in npm registry

**Error:**
```
npm error 404 Not Found - GET https://registry.npmjs.org/@aleo%2fsdk
```

**Fix:**
- Use correct package: `@aleohq/wasm-sdk` or `@demox-labs/aleo-wallet-adapter-react`
- Or use `@provablehq/sdk` (official Aleo SDK)

**Lesson:** Check package names before adding to `package.json`. Use official Aleo SDK packages.

---

### 9. ❌ Not Building Before Deploying

**Mistake:**
- Deploying without building first
- Build folder was empty

**Fix:**
- Always build before deploying:
```bash
leo build  # Build first
leo deploy ... # Then deploy
```

**Lesson:** Always run `leo build` before `leo deploy`. The build step is required.

---

### 10. ❌ Mapping Access in Non-Async Functions

**Mistake:**
- Used `Mapping::get` in regular functions
- Leo 3.4.0 requires mappings only in async functions

**Error:**
- Compilation errors about mapping access

**Fix:**
- All mapping operations must be in `async function` or `async transition`
- Use pattern: `async transition` → `async function` → `Mapping::get/set`

**Lesson:** Mapping operations are only allowed in async functions/blocks in Leo 3.4.0.

---

### 11. ❌ Wrong Puzzle Wallet Detection Method

**Mistake:**
- Checked for `window.aleo` to detect Puzzle Wallet
- Assumed `window.aleo.requestAccounts()` or `window.aleo.connect()` would work
- Used wrong wallet API methods

**Error:**
```
❌ Wallet connect error: Error: Wallet connection failed. Please ensure Puzzle Wallet is installed, unlocked, and the extension is enabled.
```

**Console showed:**
```javascript
🔍 Wallet Debug: {walletType: 'aleo', keys: Array(1), protoKeys: Array(2), allKeys: Array(3)}
// wallet was detected but connection failed!
```

**Root Cause:**
- Puzzle Wallet SDK v1.0.4 expects `window.aleo.puzzleWalletClient` NOT just `window.aleo`
- The SDK internally calls `window.aleo.puzzleWalletClient.connect.mutate()` 
- Checking only `window.aleo` gives false positive - object exists but doesn't have required structure

**Fix:**
```typescript
// ❌ WRONG - This gives false positive
const hasWallet = !!window.aleo;

// ✅ CORRECT - Check for the actual SDK client
const hasWallet = !!window?.aleo?.puzzleWalletClient;
```

**Full Working Implementation:**
```typescript
import { connect as puzzleConnect, getAccount } from "@puzzlehq/sdk-core";
import { Network } from "@puzzlehq/sdk-core";

// Correct wallet detection
private hasPuzzleWalletClient(): boolean {
  if (typeof window === "undefined") return false;
  return !!window?.aleo?.puzzleWalletClient;
}

// Correct connect flow
const connectResponse = await puzzleConnect({
  dAppInfo: {
    name: "YourAppName",
    description: "Your App Description",
    iconUrl: `${window.location.origin}/icon.svg`,
  },
  permissions: {
    programIds: {
      [Network.AleoTestnet]: [
        "your_program_1.aleo",
        "your_program_2.aleo",
      ],
    },
  },
});

// SDK returns { connection: { address, network, balances } }
const address = connectResponse?.connection?.address;
```

**Lesson:** 
1. Puzzle Wallet SDK expects `window.aleo.puzzleWalletClient`, not `window.aleo`
2. Use official `@puzzlehq/sdk-core` `connect()` function, not custom implementations
3. The `connect()` returns `{ connection: { address, network, balances } }`, not just address array
4. Use `Network.AleoTestnet` or `Network.AleoMainnet` from SDK, not custom strings

---

### 12. ❌ Frontend Program IDs Don't Match Deployed Contracts

**Mistake:**
- Used generic fallback program IDs in frontend: `meeting.aleo`, `eligibility.aleo`
- But deployed contracts have unique names: `meeting_chainmeet_7879.aleo`

**Error:**
- Frontend couldn't interact with contracts
- Transactions failed silently

**Fix:**
- Update fallback values in `aleo.ts` to match deployed contracts:
```typescript
// ❌ WRONG - Generic names that don't exist
meetingProgramId: process.env.NEXT_PUBLIC_MEETING_PROGRAM_ID || "meeting.aleo",

// ✅ CORRECT - Match your deployed contract names
meetingProgramId: process.env.NEXT_PUBLIC_MEETING_PROGRAM_ID || "meeting_chainmeet_7879.aleo",
```

- Also use correct RPC endpoint:
```typescript
// ❌ WRONG
rpcUrl: "https://api.explorer.aleo.org/v1"

// ✅ CORRECT
rpcUrl: "https://api.explorer.provable.com/v1"
```

**Lesson:** Always sync frontend fallback values with actual deployed contract names. Don't use generic placeholders.

---

## 🚨 What to Be Careful About in Future Projects

### 1. Leo Project Structure

✅ **DO:**
- Each program in its own directory
- File named `src/main.leo`
- Run `leo build` in the directory (no filename)

❌ **DON'T:**
- Put multiple programs in one directory
- Name files `program_name.leo` in root
- Run `leo build file.leo`

---

### 2. `program.json` Format

✅ **DO:**
- Use JSON object format
- Include `program`, `version`, `description`, `license`, `dependencies`

❌ **DON'T:**
- Use TOML format
- Use string format
- Use sequence format
- Omit required fields

---

### 3. Constructors

✅ **DO:**
- Always include `@noupgrade async constructor() {}`
- Required for Leo 3.4.0 deployment

❌ **DON'T:**
- Skip the constructor
- Use old constructor syntax

---

### 4. Mapping Access

✅ **DO:**
- Use `Mapping::get_or_use` with defaults for counters/optional values
- Use `Mapping::get` only when value must exist
- All mapping operations in `async function` or `async transition`

❌ **DON'T:**
- Use `Mapping::get` for counters without checking existence
- Access mappings in non-async functions
- Forget default values for optional mappings

---

### 5. Unique IDs

✅ **DO:**
- Use counter mappings for unique IDs
- Increment counters properly

❌ **DON'T:**
- Hardcode IDs to 0 or constants
- Reuse IDs
- Forget to update counters

---

### 6. Deployment Flags

✅ **DO:**
- Always specify `--endpoint`
- Use `--yes` for automated deployments
- Include `--broadcast` to submit transactions
- Set environment variables

❌ **DON'T:**
- Rely on default endpoints
- Skip confirmation flags
- Deploy without `--broadcast`

---

### 7. Program Names

✅ **DO:**
- Use unique, descriptive names
- Add random numbers or suffixes
- Match program name in `.leo` and `program.json`

❌ **DON'T:**
- Use generic names like `token.aleo`
- Reuse existing program names
- Mismatch names between files

---

### 8. Frontend Dependencies

✅ **DO:**
- Use correct package names:
  - `@aleohq/wasm-sdk`
  - `@provablehq/sdk`
  - `@demox-labs/aleo-wallet-adapter-react`
- Check package exists before adding

❌ **DON'T:**
- Use non-existent packages like `@aleo/sdk`
- Assume package names without checking
- Use outdated packages

---

### 9. Build Before Deploy

✅ **DO:**
- Always run `leo build` before `leo deploy`
- Check for build errors first
- Verify build folder has output

❌ **DON'T:**
- Skip the build step
- Deploy without building
- Ignore build warnings

---

### 10. Async Patterns

✅ **DO:**
- Use `async transition` → `async function` pattern
- Keep mapping operations in async functions
- Use `Future` return type for async transitions

❌ **DON'T:**
- Use mappings in regular functions
- Mix sync and async patterns incorrectly
- Forget `Future` return type

---

### 11. Puzzle Wallet Integration

✅ **DO:**
- Use `@puzzlehq/sdk-core` package (official SDK)
- Check for `window.aleo.puzzleWalletClient` (not just `window.aleo`)
- Use SDK's `connect()` function with proper `dAppInfo` and `permissions`
- Use `Network.AleoTestnet` or `Network.AleoMainnet` enum from SDK
- Handle the response format: `{ connection: { address, network, balances } }`
- Wait for wallet injection (extension needs time to inject)

❌ **DON'T:**
- Check only `window.aleo` for wallet detection
- Use custom `requestAccounts()` or `connect()` implementations
- Assume wallet API is same as MetaMask/Ethereum wallets
- Forget to include program IDs in permissions
- Use wrong Network enum values

**Key SDK Response Format:**
```typescript
// connect() returns:
{
  connection: {
    address: "aleo1...",
    network: "AleoTestnet",
    balances: [...]
  }
}

// getAccount() returns:
{
  address: "aleo1...",
  network: "AleoTestnet",
  ...
}
```

---

### 12. Frontend-Contract Sync

✅ **DO:**
- Match fallback program IDs with deployed contracts
- Use correct RPC endpoint: `https://api.explorer.provable.com/v1`
- Set `.env.local` with all program IDs
- Keep `puzzle.ts` and `aleo.ts` program IDs consistent

❌ **DON'T:**
- Use generic fallbacks like `meeting.aleo`
- Use wrong RPC URL: `https://api.explorer.aleo.org/v1`
- Forget to update environment variables after deployment
- Have mismatched program IDs between files

---

## 📋 Quick Checklist for New Projects

### Before Starting:
- [ ] Create separate directory for each program
- [ ] Use unique program names
- [ ] Set up correct `program.json` format
- [ ] Add constructor to each contract

### During Development:
- [ ] Use `Mapping::get_or_use` for counters/optional values
- [ ] Use `Mapping::get` only for required values
- [ ] Keep all mapping operations in async functions
- [ ] Use counter mappings for unique IDs

### Before Deployment:
- [ ] Run `leo build` in each contract directory
- [ ] Verify all contracts build successfully
- [ ] Check program names are unique
- [ ] Prepare deployment script with all flags

### During Deployment:
- [ ] Include `--endpoint` flag
- [ ] Include `--yes` flag for auto-confirm
- [ ] Include `--broadcast` flag
- [ ] Save Program IDs from output

### After Deployment:
- [ ] Update frontend `.env.local` with Program IDs
- [ ] Verify contracts on Aleo explorer
- [ ] Test all contract functions
- [ ] Check frontend can connect

### Frontend / Wallet Integration:
- [ ] Use `@puzzlehq/sdk-core` for Puzzle Wallet
- [ ] Check `window.aleo.puzzleWalletClient` (not just `window.aleo`)
- [ ] Include all program IDs in wallet permissions
- [ ] Match fallback program IDs with deployed contracts
- [ ] Use correct RPC: `https://api.explorer.provable.com/v1`
- [ ] Handle SDK response format correctly
- [ ] Test wallet connection in browser with extension installed

---

## 🎯 Summary of Key Lessons

1. **Leo Structure:** Each program in own directory, `src/main.leo`, build without filename
2. **program.json:** JSON object format, not TOML or string
3. **Constructors:** Always include `@noupgrade async constructor() {}`
4. **Mapping Access:** Use `get_or_use` with defaults, only `get` for required values
5. **Counters:** Use mapping-based counters for unique IDs
6. **Deployment:** Include all flags (`--endpoint`, `--yes`, `--broadcast`)
7. **Program Names:** Make them unique with suffixes/numbers
8. **Frontend SDK:** Use correct package names, check registry
9. **Build First:** Always build before deploying
10. **Async Patterns:** Keep mappings in async functions only
11. **Puzzle Wallet:** Check `window.aleo.puzzleWalletClient` NOT just `window.aleo`
12. **Frontend-Contract Sync:** Match fallback program IDs with deployed contracts

---

## 🔌 Puzzle Wallet Integration Quick Reference

**Correct Detection:**
```typescript
// ✅ Right way
const hasWallet = !!window?.aleo?.puzzleWalletClient;

// ❌ Wrong way (gives false positive)
const hasWallet = !!window.aleo;
```

**Correct Connection:**
```typescript
import { connect, getAccount } from "@puzzlehq/sdk-core";
import { Network } from "@puzzlehq/sdk-core";

const response = await connect({
  dAppInfo: { name: "AppName", description: "...", iconUrl: "..." },
  permissions: {
    programIds: {
      [Network.AleoTestnet]: ["program1.aleo", "program2.aleo"],
    },
  },
});

const address = response?.connection?.address;
```

**Key Points:**
- SDK expects `window.aleo.puzzleWalletClient`, not `window.aleo`
- `connect()` returns `{ connection: { address, network, balances } }`
- Use `Network.AleoTestnet` enum, not string "testnet"
- Include ALL your program IDs in permissions
- Wallet extension needs time to inject - wait for it

---

### 13. ❌ Wrong Transaction Execution Method

**Mistake:**
- Used custom `signTransaction` and `sendTransaction` methods
- These methods don't exist in Puzzle SDK v1.0.4
- Tried to manually sign and broadcast transactions

**Error:**
```
Failed to create meeting: Failed to sign transaction: Internal server error
```

**Root Cause:**
- Puzzle SDK uses `requestCreateEvent` for executing transactions, not separate sign/send methods
- The SDK handles signing internally through the wallet extension

**Fix:**
```typescript
import { requestCreateEvent, EventType } from "@puzzlehq/sdk-core";

// ✅ CORRECT - Use requestCreateEvent
const response = await requestCreateEvent({
  type: EventType.Execute,
  programId: "meeting_chainmeet_7879.aleo",
  functionId: "create_meeting",
  fee: 500000, // in microcredits (0.5 credits)
  inputs: ["input1", "input2", ...],
  address: userAddress,
  network: Network.AleoTestnet,
});

// Response contains eventId
const eventId = response.eventId;
```

**Key Points:**
- Use `requestCreateEvent` from `@puzzlehq/sdk-core` for all transactions
- Set `type: EventType.Execute` for contract function calls
- Fee is in microcredits (1 credit = 1,000,000 microcredits)
- Inputs must be properly formatted for Leo (e.g., `123u64`, `addressfield`)
- The SDK handles wallet popup, signing, and broadcasting internally

**Lesson:** Always check SDK documentation for the correct transaction execution method. Don't assume standard sign/send patterns from other blockchains.

---

## ✅ Success!

All three contracts successfully deployed to Aleo Testnet:
- ✅ `meeting_chainmeet_7879.aleo`
- ✅ `eligibility_chainmeet_8903.aleo`
- ✅ `attendance_chainmeet_1735.aleo`

Frontend wallet integration fixed! ✅
Transaction execution using requestCreateEvent! ✅

---

# VoteAleo - Wallet Integration Fixes

## Issues Found and Fixed (January 2026)

### 14. ❌ Custom Wallet Implementation Instead of Wallet Adapter

**Mistake:**
- Used custom `walletService` with direct `window.leoWallet.connect()` calls
- Used `@puzzlehq/sdk-core` `connect()` directly without proper adapter integration
- Wallet connected automatically on unlock without asking for program permissions
- Contract not loading properly - no signature request for program access

**Error:**
- Leo wallet not connecting even with extension installed
- Puzzle wallet connecting automatically without asking for signature
- Contract not loading in the wallet

**Root Cause:**
- The proper way to integrate Aleo wallets is using the `@demox-labs/aleo-wallet-adapter` package ecosystem
- Direct SDK calls bypass the permission/decryption flow required by wallets
- The adapter handles program permissions, decryption requests, and signature prompts

**Fix:**
1. Created `WalletWrapper.tsx` using proper wallet adapters:
```typescript
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { PuzzleWalletAdapter } from 'aleo-adapters';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

const wallets = useMemo(() => [
  new LeoWalletAdapter({ appName: 'VoteAleo' }),
  new PuzzleWalletAdapter({
    programIdPermissions: {
      [WalletAdapterNetwork.MainnetBeta]: [PROGRAM_ID],
      [WalletAdapterNetwork.TestnetBeta]: [PROGRAM_ID],
    },
    appName: 'VoteAleo',
    appDescription: 'Privacy-preserving voting on Aleo blockchain',
  }),
], []);

<WalletProvider
  wallets={wallets}
  decryptPermission={DecryptPermission.UponRequest}
  network={WalletAdapterNetwork.TestnetBeta}
  autoConnect
>
  <WalletModalProvider>{children}</WalletModalProvider>
</WalletProvider>
```

2. Used `WalletMultiButton` for connection UI instead of custom buttons
3. Used `useWallet()` hook from `@demox-labs/aleo-wallet-adapter-react`
4. Used `Transaction.createTransaction()` and `requestTransaction()` for transactions

**Required Packages:**
- `@demox-labs/aleo-wallet-adapter-base`
- `@demox-labs/aleo-wallet-adapter-react`
- `@demox-labs/aleo-wallet-adapter-reactui`
- `@demox-labs/aleo-wallet-adapter-leo`
- `aleo-adapters` (contains PuzzleWalletAdapter)

**Lesson:** Always use the official wallet adapter libraries instead of custom implementations. The adapter handles all the complexity of permissions, signatures, and wallet-specific behaviors.

---

### 15. ❌ Hardcoded Demo Campaigns Instead of Blockchain Data

**Mistake:**
- Campaigns page had hardcoded `demoCampaigns` array with fake data
- Campaign detail page also used demo campaigns
- No actual blockchain data was being loaded

**Code Before:**
```typescript
const demoCampaigns: Campaign[] = [
  { id: '1', title: 'DAO Treasury Allocation Q1 2025', ... },
  { id: '2', title: 'Protocol Upgrade Proposal v2.0', ... },
  { id: '3', title: 'New Governance Council Election', ... },
];
// Used demoCampaigns instead of fetching from blockchain
```

**Fix:**
1. Removed hardcoded `demoCampaigns` array
2. Implemented actual blockchain fetching using `aleoService`:
```typescript
const loadCampaigns = async () => {
  const campaignCount = await aleoService.getCampaignCount();
  for (let i = 1; i <= campaignCount; i++) {
    const onChainCampaign = await aleoService.fetchCampaign(i);
    // Parse and use actual data
  }
};
```
3. Added IPFS metadata fetching using `pinataService.fetchJSON()`
4. Added proper Aleo struct parsing for on-chain data

**Lesson:** Never use hardcoded demo data in production. Always fetch real data from the blockchain and handle cases where no data exists gracefully.

---

### 16. ❌ Old Wallet Service Methods After Refactoring

**Mistake:**
- After refactoring wallet service, old method calls like `walletService.castVote()` were still being used
- Created page and campaign detail page still referenced removed methods

**Error:**
```
Type error: Property 'castVote' does not exist on type 'WalletService'.
```

**Fix:**
1. Updated `walletService` to only provide transaction formatting:
```typescript
formatCastVoteTransaction(campaignId: number, optionIndex: number): TransactionRequest {
  // Returns formatted transaction request
}
```

2. Updated pages to use wallet adapter for transactions:
```typescript
const { requestTransaction } = useWallet();

const txRequest = walletService.formatCastVoteTransaction(campaignId, optionIndex);
const aleoTransaction = Transaction.createTransaction(
  address,
  WalletAdapterNetwork.TestnetBeta,
  txRequest.programId,
  txRequest.functionId,
  txRequest.inputs,
  txRequest.fee
);
const txId = await requestTransaction(aleoTransaction);
```

**Lesson:** When refactoring, search for all usages of changed methods and update them. Use TypeScript to catch these errors during build.

---

### 17. ❌ Type Errors in Boolean Comparisons

**Mistake:**
- Used `=== true` comparison with a string type variable:
```typescript
isActive: result.is_active === 'true' || result.is_active === true,
```

**Error:**
```
Type error: This comparison appears to be unintentional because the types 'string' and 'boolean' have no overlap.
```

**Fix:**
```typescript
// Since is_active from Aleo is a string 'true' or 'false'
isActive: result.is_active === 'true',
```

**Lesson:** Aleo returns boolean values as strings ('true'/'false') not actual booleans. Only compare against the string representation.

---

### 18. ❌ Optional Parameter Without Null Check

**Mistake:**
- Passed optional `metadataHash` directly to function expecting string:
```typescript
const metadata = await fetchCampaignMetadata(campaignData.metadataHash);
```

**Error:**
```
Type error: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

**Fix:**
```typescript
if (!campaignData.metadataHash) throw new Error('No metadata hash');
const metadata = await fetchCampaignMetadata(campaignData.metadataHash);
```

**Lesson:** Always check for undefined before passing optional properties to functions that expect non-optional parameters.

---

## ✅ VoteAleo Summary

### What Was Fixed:
1. ✅ Proper wallet adapter integration with `WalletProvider`
2. ✅ Leo wallet connection now works with signature request
3. ✅ Puzzle wallet asks for program permissions before connecting
4. ✅ Contract loads properly in wallet
5. ✅ Removed fake demo campaigns
6. ✅ Campaigns now load from blockchain
7. ✅ IPFS metadata fetching works directly from frontend
8. ✅ All type errors resolved
9. ✅ Build succeeds

### Key Dependencies Added:
- `@demox-labs/aleo-wallet-adapter-leo` - Leo wallet adapter

### Files Changed:
- `src/components/wallet/WalletWrapper.tsx` - New wallet provider wrapper
- `src/components/Providers.tsx` - New providers component
- `src/components/wallet/WalletConnect.tsx` - Updated to use useWallet hook
- `src/app/layout.tsx` - Wrapped with Providers
- `src/app/campaigns/page.tsx` - Removed demo data, added blockchain fetching
- `src/app/campaign/[id]/page.tsx` - Removed demo data, added blockchain fetching
- `src/app/create/page.tsx` - Updated to use wallet adapter transactions
- `src/services/wallet.ts` - Simplified to transaction formatting only
- `src/app/globals.css` - Added wallet adapter button styles
- `src/types/index.ts` - Added metadataHash field

### Reference Implementation:
The zk-auction-example from ProvableHQ was used as reference:
- https://github.com/ProvableHQ/zk-auction-example
- Specifically `WalletWrapper.jsx` for proper adapter setup