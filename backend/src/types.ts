export type AuctionStrategy = 'first_price' | 'vickrey' | 'dutch' | 'english';
export type AuctionTokenType = 'aleo' | 'usdcx' | 'usad';

export type AuctionStatus =
  | 'ACTIVE'
  | 'CLOSED'
  | 'REVEALING'
  | 'SETTLED'
  | 'CANCELLED'
  | 'FAILED'
  | 'DISPUTED'
  | 'EXPIRED'
  | 'UNKNOWN';

export type CreateOrUpdateAuctionPayload = {
  auctionId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  strategy?: AuctionStrategy;
  tokenType?: AuctionTokenType;
  creatorAddress?: string;
  originalDeadline?: number;
};

export type CreateBidPayload = {
  bidderAddress: string;
  bidNonce: string;
  commitmentHash: string;
  tokenType: string;
};

