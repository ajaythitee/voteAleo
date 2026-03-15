export type SupportedWalletType = 'shield' | 'leo' | 'puzzle' | 'fox' | 'soter' | 'unknown';

export interface WalletCapabilities {
  supportsCampaigns: boolean;
  supportsPublicAuctions: boolean;
  supportsPrivateAuctionRecords: boolean;
  recommendedForPrivateFlows: boolean;
  shortLabel: string;
  summary: string;
}

const capabilityMap: Record<SupportedWalletType, WalletCapabilities> = {
  shield: {
    supportsCampaigns: true,
    supportsPublicAuctions: true,
    supportsPrivateAuctionRecords: true,
    recommendedForPrivateFlows: true,
    shortLabel: 'Shield ready',
    summary: 'Best choice for private and mixed auctions because record selection is smoother.',
  },
  leo: {
    supportsCampaigns: true,
    supportsPublicAuctions: true,
    supportsPrivateAuctionRecords: false,
    recommendedForPrivateFlows: false,
    shortLabel: 'Public flow friendly',
    summary: 'Great for campaigns and public auctions. Private record flows may require manual recovery or may fail.',
  },
  puzzle: {
    supportsCampaigns: true,
    supportsPublicAuctions: true,
    supportsPrivateAuctionRecords: false,
    recommendedForPrivateFlows: false,
    shortLabel: 'Public flow friendly',
    summary: 'Campaigns and public bidding should work. Private record-heavy auction steps are not recommended.',
  },
  fox: {
    supportsCampaigns: true,
    supportsPublicAuctions: true,
    supportsPrivateAuctionRecords: false,
    recommendedForPrivateFlows: false,
    shortLabel: 'Public flow friendly',
    summary: 'Works well for standard campaign and public auction actions. Private record flows are better in Shield.',
  },
  soter: {
    supportsCampaigns: true,
    supportsPublicAuctions: true,
    supportsPrivateAuctionRecords: false,
    recommendedForPrivateFlows: false,
    shortLabel: 'Public flow friendly',
    summary: 'Good for regular transactions. Private auction record management is safer in Shield.',
  },
  unknown: {
    supportsCampaigns: true,
    supportsPublicAuctions: true,
    supportsPrivateAuctionRecords: false,
    recommendedForPrivateFlows: false,
    shortLabel: 'Compatibility unknown',
    summary: 'Campaigns and public actions may work, but Shield is the safe recommendation for private records.',
  },
};

export function getWalletCapabilities(walletType: SupportedWalletType | null | undefined): WalletCapabilities {
  return capabilityMap[walletType ?? 'unknown'] ?? capabilityMap.unknown;
}

export function getPrivateAuctionWalletWarning(walletType: SupportedWalletType | null | undefined): string | null {
  const capabilities = getWalletCapabilities(walletType);
  if (capabilities.supportsPrivateAuctionRecords) {
    return null;
  }

  return `${capabilities.summary} Switch to Shield Wallet before using private bid, private winner selection, or redemption flows.`;
}
