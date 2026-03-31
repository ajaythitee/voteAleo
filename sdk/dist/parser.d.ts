import type { ParsedAuction } from './types.js';
export declare function parseOnChainAuction(data: unknown, auctionId: string, meta?: Partial<ParsedAuction> | null): ParsedAuction | null;
