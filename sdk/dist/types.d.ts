export interface TransactionParams {
    programId: string;
    functionId: string;
    inputs: string[];
    fee: number;
    recordIndices?: number[];
    privateFee?: boolean;
}
export interface ParsedAuction {
    name: string;
    description?: string;
    startingBid: number;
    imageUrl?: string;
    strategy?: 'first_price' | 'vickrey' | 'dutch' | 'english';
    tokenType?: 'aleo' | 'usdcx' | 'usad';
}
export type RpcConfig = {
    rpcUrl: string;
    network: string;
    auctionProgramId: string;
};
