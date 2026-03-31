import type { RpcConfig } from './types.js';
export declare function createAuctionReader(cfg: RpcConfig): {
    getAuctionCount(): Promise<number>;
    getPublicAuctionIdByIndex(index: number): Promise<string | null>;
    getPublicAuction(auctionId: string): Promise<string | null>;
    getHighestBid(auctionId: string): Promise<number>;
    getSecondHighestBid(auctionId: string): Promise<number>;
    getAuctionEscrow(auctionId: string): Promise<number>;
    getDutchParams(auctionId: string): Promise<string | null>;
    getDisputeData(auctionId: string): Promise<string | null>;
};
