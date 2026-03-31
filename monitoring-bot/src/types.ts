export type BackendAuction = {
  auctionId: string;
  status?: string;
};

export type OnChainAuction = {
  status: number;
  mode: number;
  tokenType: number;
  bidCount: number;
  deadline: number;
  createdAt: number;
  disputeDeadline: number;
};

export type DutchParams = {
  startPrice: number;
  endPrice: number;
};

