import credits.aleo;

program privote_auction_5000.aleo {

    @noupgrade
    async constructor() {}

    struct auction {
        starting_bid: u64,
        name: field,
        item: item,
    }

    struct item {
        id: field,
        offchain_data: [field; 4],
    }

    struct privacy_settings {
        auction_privacy: field,
        bid_types_accepted: field,
    }

    struct bid {
        amount: u64,
        auction_id: field,
        bid_public_key: group,
    }

    mapping auctions: u64 => field;
    mapping bid_count: field => u64;
    mapping auction_public_keys: field => group;
    mapping winning_bids: field => field;
    mapping public_auctions: field => auction;
    mapping auction_owners: field => address;
    mapping auction_privacy_settings: field => privacy_settings;
    mapping highest_bids: field => u64;
    mapping redemptions: field => bool;
    mapping auction_counter: u8 => u64;
    mapping public_auction_index: u64 => field;
    mapping public_bids: field => bid;
    mapping public_bid_owners: field => address;

    record AuctionTicket {
        owner: address,
        auction: auction,
        auction_id: field,
        settings: privacy_settings,
    }

    record AuctionInvite {
        owner: address,
        auction: auction,
        auctioneer: address,
        auction_id: field,
        settings: privacy_settings,
    }

    record BidReceipt {
        owner: address,
        auction_id: field,
        bid: bid,
        bid_id: field,
    }

    record PrivateBid {
        owner: address,
        bid: bid,
        bid_id: field,
    }

    inline create_bid(amount: u64, auction_id: field, nonce: scalar) -> (field, bid) {
        let bid_public_key: group = nonce*group::GEN;
        let new_bid: bid = bid {
            amount,
            auction_id,
            bid_public_key,
        };
        let bid_commit_key: group = nonce*(self.signer as group);
        let bid_id: field = (Poseidon2::hash_to_scalar(new_bid)*bid_commit_key) as field;
        return (bid_id, new_bid);
    }

    async transition create_private_auction(
        bid_types_accepted: field,
        item_id: field,
        auction_name: field,
        item_offchain_data: [field; 4],
        starting_bid: u64,
        nonce: scalar,
    ) -> (AuctionTicket, Future) {
        assert(bid_types_accepted < 3field);
        let auction_public_key: group = nonce*group::GEN;
        let auction_commit_key: group = nonce*(self.signer as group);
        let settings: privacy_settings = privacy_settings {
            auction_privacy: 0field,
            bid_types_accepted,
        };
        let auction_item: item = item {
            id: item_id,
            offchain_data: item_offchain_data,
        };
        let new_auction: auction = auction {
            starting_bid,
            name: auction_name,
            item: auction_item,
        };
        let auction_id: field = (Poseidon2::hash_to_scalar(new_auction)*auction_commit_key) as field;
        let ticket: AuctionTicket = AuctionTicket {
            owner: self.signer,
            auction: new_auction,
            auction_id,
            settings,
        };
        let create_auction_private_future: Future = finalize_create_private_auction(auction_id, auction_public_key);
        return (ticket, create_auction_private_future);
    }
    async function finalize_create_private_auction(auction_id: field, apk: group) {
        assert(!auction_public_keys.contains(auction_id));
        auction_public_keys.set(auction_id, apk);
    }

    async transition create_public_auction(
        auction_name: field,
        bid_types_accepted: field,
        item_id: field,
        item_offchain_data: [field; 4],
        starting_bid: u64,
        nonce: scalar,
        reveal_address: bool,
    ) -> (AuctionTicket, Future) {
        assert(bid_types_accepted < 3field);
        let auction_public_key: group = nonce*group::GEN;
        let auction_commit_key: group = nonce*(self.signer as group);
        let settings: privacy_settings = privacy_settings {
            auction_privacy: 1field,
            bid_types_accepted,
        };
        let auction_item: item = item {
            id: item_id,
            offchain_data: item_offchain_data,
        };
        let new_auction: auction = auction {
            starting_bid,
            name: auction_name,
            item: auction_item,
        };
        let auction_id: field = (Poseidon2::hash_to_scalar(new_auction)*auction_commit_key) as field;
        let auction_ticket: AuctionTicket = AuctionTicket {
            owner: self.signer,
            auction: new_auction,
            auction_id,
            settings,
        };
        let auctioneer: address = self.address;
        if reveal_address {
            auctioneer = self.signer;
        }
        let create_auction_public_future: Future = finalize_create_public_auction(new_auction, auction_id, auction_public_key, self.signer, settings);
        return (auction_ticket, create_auction_public_future);
    }
    async function finalize_create_public_auction(new_auction: auction, auction_id: field, auction_public_key: group, auctioneer: address, settings: privacy_settings) {
        assert(!auction_public_keys.contains(auction_id));
        if auctioneer != self.address {
            auction_owners.set(auction_id, auctioneer);
        }
        public_auctions.set(auction_id, new_auction);
        auction_privacy_settings.set(auction_id, settings);
        auction_public_keys.set(auction_id, auction_public_key);
        let c: u64 = Mapping::get_or_use(auction_counter, 0u8, 0u64);
        auction_counter.set(0u8, c + 1u64);
        public_auction_index.set(c + 1u64, auction_id);
    }

    async transition publish_address(auction_ticket: AuctionTicket) -> (AuctionTicket, Future) {
        assert_eq(auction_ticket.settings.auction_privacy, 0field);
        return (auction_ticket, finalize_publish_address(auction_ticket.auction_id, self.signer));
    }
    async function finalize_publish_address(auction_id: field, auctioneer: address) {
        assert(auction_public_keys.contains(auction_id));
        auction_owners.set(auction_id, auctioneer);
    }

    async transition publish_auction_data(auction_ticket: AuctionTicket) -> (AuctionTicket, Future) {
        assert_eq(auction_ticket.settings.auction_privacy, 0field);
        return (auction_ticket, finalize_publish_auction_data(auction_ticket.auction_id, auction_ticket.auction));
    }
    async function finalize_publish_auction_data(auction_id: field, auction_info: auction) {
        assert(!public_auctions.contains(auction_id));
        public_auctions.set(auction_id, auction_info);
    }

    transition invite_to_auction(
        auction_ticket: AuctionTicket,
        invitee: address
    ) -> (AuctionInvite, AuctionTicket) {
        let auction_invite: AuctionInvite = AuctionInvite {
            owner: invitee,
            auctioneer: auction_ticket.owner,
            auction: auction_ticket.auction,
            auction_id: auction_ticket.auction_id,
            settings: auction_ticket.settings,
        };
        let new_auction_ticket: AuctionTicket = AuctionTicket {
            owner: auction_ticket.owner,
            auction: auction_ticket.auction,
            auction_id: auction_ticket.auction_id,
            settings: auction_ticket.settings,
        };
        return (auction_invite, new_auction_ticket);
    }

    async transition select_winner_private(
        auction_ticket: AuctionTicket,
        private_bid: PrivateBid,
    ) -> Future {
        assert_neq(auction_ticket.settings.bid_types_accepted, 1field);
        assert_eq(auction_ticket.auction_id, private_bid.bid.auction_id);
        assert(private_bid.bid.amount >= auction_ticket.auction.starting_bid);
        return finalize_select_winner_private(private_bid.bid.amount, private_bid.bid.auction_id, private_bid.bid_id);
    }
    async function finalize_select_winner_private(
        amount: u64,
        auction_id: field,
        bid_id: field
    ) {
        let highest_bid_amount: u64 = Mapping::get_or_use(highest_bids, auction_id, 0u64);
        assert_eq(amount, highest_bid_amount);
        winning_bids.set(auction_id, bid_id);
    }

    async transition select_winner_public(
        auction_ticket: AuctionTicket,
        winning_bid: bid,
        winning_bid_id: field,
    ) -> Future {
        assert_neq(auction_ticket.settings.bid_types_accepted, 0field);
        assert(winning_bid.amount >= auction_ticket.auction.starting_bid);
        let redemption_future: Future = finalize_select_winner_public(auction_ticket.auction_id, winning_bid_id, winning_bid);
        return redemption_future;
    }
    async function finalize_select_winner_public(auction_id: field, bid_id: field, winning_bid: bid) {
        let stored_bid: bid = public_bids.get(bid_id);
        assert_eq(stored_bid, winning_bid);
        let highest_bid_amount: u64 = Mapping::get_or_use(highest_bids, auction_id, 0u64);
        assert_eq(winning_bid.amount, highest_bid_amount);
        winning_bids.set(auction_id, bid_id);
    }

    async transition bid_public(
        amount: u64,
        auction_id: field,
        nonce: scalar,
        publish_bidder_address: bool,
    ) -> (BidReceipt, Future) {
        let bid_public_key: group = nonce*group::GEN;
        let (bid_id, public_bid): (field, bid) = create_bid(amount, auction_id, nonce);
        let receipt: BidReceipt = BidReceipt {
            owner: self.signer,
            auction_id,
            bid: public_bid,
            bid_id,
        };
        let bid_address: address = self.address;
        if publish_bidder_address {
            bid_address = self.signer;
        }
        let finalize_bid_future: Future = finalize_bid_public(public_bid, bid_id, bid_address);
        return (receipt, finalize_bid_future);
    }
    async function finalize_bid_public(public_bid: bid, bid_id: field, bid_address: address) {
        assert(auction_public_keys.contains(public_bid.auction_id));
        assert(!winning_bids.contains(public_bid.auction_id));
        assert(!public_bids.contains(bid_id));
        public_bids.set(bid_id, public_bid);
        bid_count.set(public_bid.auction_id, Mapping::get_or_use(bid_count, public_bid.auction_id, 0u64) + 1u64);
        let highest_bid_amount: u64 = Mapping::get_or_use(highest_bids, public_bid.auction_id, 0u64);
        if public_bid.amount > highest_bid_amount {
            highest_bids.set(public_bid.auction_id, public_bid.amount);
        }
        if bid_address != self.address {
            public_bid_owners.set(bid_id, bid_address);
        }
    }

    async transition bid_private(
        amount: u64,
        auction_id: field,
        auctioneer: address,
        auction_public_key: group,
        nonce: scalar,
    ) -> (BidReceipt, PrivateBid, Future) {
        let (bid_id, private_bid): (field, bid) = create_bid(amount, auction_id, nonce);
        let receipt: BidReceipt = BidReceipt {
            owner: self.signer,
            auction_id,
            bid: private_bid,
            bid_id,
        };
        let private_bid_record: PrivateBid = PrivateBid {
            owner: auctioneer,
            bid: private_bid,
            bid_id,
        };
        return (receipt, private_bid_record, finalize_bid_private(amount, auction_id));
    }
    async function finalize_bid_private(amount: u64, auction_id: field) {
        assert(auction_public_keys.contains(auction_id));
        assert(!winning_bids.contains(auction_id));
        bid_count.set(auction_id, Mapping::get_or_use(bid_count, auction_id, 0u64) + 1u64);
        let highest_amount: u64 = Mapping::get_or_use(highest_bids, auction_id, 0u64);
        if amount > highest_amount {
            highest_bids.set(auction_id, amount);
        }
    }

    async transition redeem_bid_public(
        auctioneer: address,
        bid_receipt: BidReceipt,
    ) -> Future {
        let transfer_public: Future = credits.aleo/transfer_public_as_signer(auctioneer, bid_receipt.bid.amount);
        return finalize_redeem_bid_public(auctioneer, bid_receipt.bid.auction_id, bid_receipt.bid_id, transfer_public);
    }
    async function finalize_redeem_bid_public(auctioneer: address, auction_id: field, bid_id: field, transfer: Future) {
        assert_eq(auction_owners.get(auction_id), auctioneer);
        let winning_bid_id: field = winning_bids.get(auction_id);
        assert_eq(winning_bid_id, bid_id);
        assert(!redemptions.contains(auction_id));
        transfer.await();
        redemptions.set(auction_id, true);
    }

    async transition redeem_bid_private_to_public(
        auctioneer: address,
        bid_receipt: BidReceipt,
        transfer_record: credits.aleo/credits,
    ) -> Future {
        assert(transfer_record.microcredits >= bid_receipt.bid.amount);
        let transfer_private_to_public: (credits.aleo/credits, Future)= credits.aleo/transfer_private_to_public(transfer_record, auctioneer, bid_receipt.bid.amount);
        return finalize_redeem_bid_p2p(auctioneer, bid_receipt.bid.auction_id, bid_receipt.bid_id, transfer_private_to_public.1);
    }
    async function finalize_redeem_bid_p2p(auctioneer: address, auction_id: field, bid_id: field, transfer: Future) {
        assert_eq(auction_owners.get(auction_id), auctioneer);
        let winning_bid_id: field = winning_bids.get(auction_id);
        assert_eq(winning_bid_id, bid_id);
        assert(!redemptions.contains(auction_id));
        transfer.await();
        redemptions.set(auction_id, true);
    }

    async transition redeem_bid_private(
        invite: AuctionInvite,
        bid_receipt: BidReceipt,
        transfer_record: credits.aleo/credits,
    ) -> Future {
        assert(transfer_record.microcredits >= bid_receipt.bid.amount);
        credits.aleo/transfer_private(transfer_record, invite.auctioneer, bid_receipt.bid.amount);
        return finalize_redeem_bid_private(bid_receipt.bid.auction_id, bid_receipt.bid_id);
    }
    async function finalize_redeem_bid_private(auction_id: field, bid_id: field) {
        let winning_bid_id: field = winning_bids.get(auction_id);
        assert_eq(winning_bid_id, bid_id);
        assert(!redemptions.contains(auction_id));
        redemptions.set(auction_id, true);
    }
}

