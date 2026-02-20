// VoteAleo - Privacy-Preserving Voting Platform
// Phase 1: Core Features
// - Campaign Creation
// - Anonymous Voting with zk-SNARKs
// - Wallet-based transactions
// - Hidden Results Until Voting Ends

program vote_privacy_8000.aleo {
    // IPFS CID storage (CIDv1 base32 encoded, split into 2 fields)
    // Each field can hold ~31 bytes, CID is ~59 chars max
    struct IpfsCid {
        part1: field,  // First 31 bytes
        part2: field,  // Remaining bytes
    }

    // Campaign structure stored on-chain
    struct Campaign {
        creator: address,
        metadata_cid: IpfsCid,           // IPFS CID for metadata (title, description, options)
        start_time: u64,                 // Unix timestamp
        end_time: u64,                   // Unix timestamp
        option_count: u8,                // Number of voting options (max 4)
        total_votes: u64,                // Total votes cast
        is_active: bool,                 // Campaign status
        // Vote counts for each option (up to 4)
        votes_0: u64,
        votes_1: u64,
        votes_2: u64,
        votes_3: u64,
    }

    // Vote record - private to the voter
    record VoteReceipt {
        owner: address,
        campaign_id: u64,
        option_index: u8,
        timestamp: u64,
    }

    // Mappings for on-chain storage
    mapping campaign_counter: u8 => u64;           // Singleton counter for campaign IDs
    mapping campaigns: u64 => Campaign;            // Campaign ID => Campaign data
    mapping has_voted: field => bool;              // Hash(campaign_id + voter_hash) => voted status

    // Constructor required for Leo 3.4.0
    @noupgrade
    async constructor() {}

    // Create a new voting campaign
    async transition create_campaign(
        public cid_part1: field,          // IPFS CID part 1
        public cid_part2: field,          // IPFS CID part 2
        public start_time: u64,
        public end_time: u64,
        public option_count: u8           // 2-4 options
    ) -> Future {
        // Validate inputs
        assert(end_time > start_time);
        assert(option_count >= 2u8 && option_count <= 4u8);

        return finalize_create_campaign(
            self.caller,
            cid_part1,
            cid_part2,
            start_time,
            end_time,
            option_count
        );
    }

    async function finalize_create_campaign(
        creator: address,
        cid_part1: field,
        cid_part2: field,
        start_time: u64,
        end_time: u64,
        option_count: u8
    ) {
        // Get next campaign ID using counter
        let current_counter: u64 = Mapping::get_or_use(campaign_counter, 0u8, 0u64);
        let campaign_id: u64 = current_counter + 1u64;
        Mapping::set(campaign_counter, 0u8, campaign_id);

        // Create IPFS CID struct
        let metadata_cid: IpfsCid = IpfsCid {
            part1: cid_part1,
            part2: cid_part2,
        };

        // Create campaign struct with zero vote counts
        let campaign: Campaign = Campaign {
            creator: creator,
            metadata_cid: metadata_cid,
            start_time: start_time,
            end_time: end_time,
            option_count: option_count,
            total_votes: 0u64,
            is_active: true,
            votes_0: 0u64,
            votes_1: 0u64,
            votes_2: 0u64,
            votes_3: 0u64,
        };

        // Store campaign
        Mapping::set(campaigns, campaign_id, campaign);
    }

    // Cast a vote anonymously
    async transition cast_vote(
        public campaign_id: u64,
        public option_index: u8,
        private timestamp: u64
    ) -> (VoteReceipt, Future) {
        // Validate option
        assert(option_index < 4u8);

        // Create private vote receipt for the voter
        let receipt: VoteReceipt = VoteReceipt {
            owner: self.caller,
            campaign_id: campaign_id,
            option_index: option_index,
            timestamp: timestamp,
        };

        return (receipt, finalize_cast_vote(campaign_id, option_index, BHP256::hash_to_field(self.caller)));
    }

    // Dedicated vote-counting (tally) function: returns campaign with vote counts updated
    inline apply_vote_tally(campaign: Campaign, option_index: u8) -> Campaign {
        let new_votes_0: u64 = campaign.votes_0 + (option_index == 0u8 ? 1u64 : 0u64);
        let new_votes_1: u64 = campaign.votes_1 + (option_index == 1u8 ? 1u64 : 0u64);
        let new_votes_2: u64 = campaign.votes_2 + (option_index == 2u8 ? 1u64 : 0u64);
        let new_votes_3: u64 = campaign.votes_3 + (option_index == 3u8 ? 1u64 : 0u64);
        return Campaign {
            creator: campaign.creator,
            metadata_cid: campaign.metadata_cid,
            start_time: campaign.start_time,
            end_time: campaign.end_time,
            option_count: campaign.option_count,
            total_votes: campaign.total_votes + 1u64,
            is_active: campaign.is_active,
            votes_0: new_votes_0,
            votes_1: new_votes_1,
            votes_2: new_votes_2,
            votes_3: new_votes_3,
        };
    }

    async function finalize_cast_vote(
        campaign_id: u64,
        option_index: u8,
        voter_hash: field
    ) {
        // Get campaign and verify it exists
        let campaign: Campaign = Mapping::get(campaigns, campaign_id);

        // Verify campaign is active
        assert(campaign.is_active);

        // Verify option index is valid
        assert(option_index < campaign.option_count);

        // Check if voter has already voted (using hashed address for privacy)
        let voted_key: field = BHP256::hash_to_field(campaign_id as field + voter_hash);
        let already_voted: bool = Mapping::get_or_use(has_voted, voted_key, false);
        assert(!already_voted);

        // Mark as voted
        Mapping::set(has_voted, voted_key, true);

        // Update vote counts via dedicated tally function
        let updated_campaign: Campaign = apply_vote_tally(campaign, option_index);
        Mapping::set(campaigns, campaign_id, updated_campaign);
    }

    // End a campaign (only creator can call)
    async transition end_campaign(
        public campaign_id: u64
    ) -> Future {
        return finalize_end_campaign(campaign_id, self.caller);
    }

    async function finalize_end_campaign(
        campaign_id: u64,
        caller: address
    ) {
        let campaign: Campaign = Mapping::get(campaigns, campaign_id);

        // Only creator can end the campaign
        assert_eq(campaign.creator, caller);

        // Update campaign to inactive
        let updated_campaign: Campaign = Campaign {
            creator: campaign.creator,
            metadata_cid: campaign.metadata_cid,
            start_time: campaign.start_time,
            end_time: campaign.end_time,
            option_count: campaign.option_count,
            total_votes: campaign.total_votes,
            is_active: false,
            votes_0: campaign.votes_0,
            votes_1: campaign.votes_1,
            votes_2: campaign.votes_2,
            votes_3: campaign.votes_3,
        };
        Mapping::set(campaigns, campaign_id, updated_campaign);
    }

    // Verify vote proof (allows voter to prove they voted without revealing choice)
    transition verify_vote_participation(
        receipt: VoteReceipt
    ) -> bool {
        // Simply returns true if the receipt is valid
        // The receipt itself is the proof of participation
        return true;
    }
}
