function parseNumberish(raw) {
    const match = raw.match(/(\\d+)/);
    return match ? Number(match[1]) : 0;
}
function rpcUrl(cfg, path) {
    return `${cfg.rpcUrl}/${cfg.network}/program/${cfg.auctionProgramId}/mapping/${path}`;
}
async function fetchText(url) {
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok)
            return null;
        return (await res.text()).trim();
    }
    catch {
        return null;
    }
}
export function createAuctionReader(cfg) {
    return {
        async getAuctionCount() {
            const raw = await fetchText(rpcUrl(cfg, 'auction_counter/0u8'));
            return raw ? Math.min(parseNumberish(raw), 500) : 0;
        },
        async getPublicAuctionIdByIndex(index) {
            const raw = await fetchText(rpcUrl(cfg, `public_auction_index/${index}u64`));
            return raw || null;
        },
        async getPublicAuction(auctionId) {
            const raw = await fetchText(rpcUrl(cfg, `auctions/${encodeURIComponent(auctionId)}`));
            return raw || null;
        },
        async getHighestBid(auctionId) {
            const raw = await fetchText(rpcUrl(cfg, `highest_bids/${encodeURIComponent(auctionId)}`));
            return raw ? parseNumberish(raw) : 0;
        },
        async getSecondHighestBid(auctionId) {
            const raw = await fetchText(rpcUrl(cfg, `second_highest_bids/${encodeURIComponent(auctionId)}`));
            return raw ? parseNumberish(raw) : 0;
        },
        async getAuctionEscrow(auctionId) {
            const raw = await fetchText(rpcUrl(cfg, `auction_escrow/${encodeURIComponent(auctionId)}`));
            return raw ? parseNumberish(raw) : 0;
        },
        async getDutchParams(auctionId) {
            const raw = await fetchText(rpcUrl(cfg, `dutch_params/${encodeURIComponent(auctionId)}`));
            return raw || null;
        },
        async getDisputeData(auctionId) {
            const raw = await fetchText(rpcUrl(cfg, `disputes/${encodeURIComponent(auctionId)}`));
            return raw || null;
        },
    };
}
