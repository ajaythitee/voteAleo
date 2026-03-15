import { z } from 'zod';

const runtimeEnvSchema = z.object({
  NEXT_PUBLIC_ALEO_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  NEXT_PUBLIC_ALEO_RPC_URL: z.string().url().default('https://api.explorer.provable.com/v1'),
  NEXT_PUBLIC_VOTING_PROGRAM_ID: z.string().trim().optional(),
  NEXT_PUBLIC_AUCTION_PROGRAM_ID: z.string().trim().optional(),
  NEXT_PUBLIC_PINATA_JWT: z.string().trim().optional(),
  NEXT_PUBLIC_PINATA_GATEWAY: z.string().trim().default('gateway.pinata.cloud'),
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().default('gemini-2.5-flash'),
});

const runtimeEnv = runtimeEnvSchema.parse({
  NEXT_PUBLIC_ALEO_NETWORK: process.env.NEXT_PUBLIC_ALEO_NETWORK,
  NEXT_PUBLIC_ALEO_RPC_URL: process.env.NEXT_PUBLIC_ALEO_RPC_URL,
  NEXT_PUBLIC_VOTING_PROGRAM_ID: process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID,
  NEXT_PUBLIC_AUCTION_PROGRAM_ID: process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID,
  NEXT_PUBLIC_PINATA_JWT: process.env.NEXT_PUBLIC_PINATA_JWT,
  NEXT_PUBLIC_PINATA_GATEWAY: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
});

export type RuntimeFeatureKey = 'campaigns' | 'auctions' | 'pinata' | 'ai';

const featureRequirements: Record<RuntimeFeatureKey, string[]> = {
  campaigns: ['NEXT_PUBLIC_VOTING_PROGRAM_ID'],
  auctions: ['NEXT_PUBLIC_AUCTION_PROGRAM_ID'],
  pinata: ['NEXT_PUBLIC_PINATA_JWT'],
  ai: ['GEMINI_API_KEY'],
};

function getEnvValue(key: string): string | undefined {
  return runtimeEnv[key as keyof typeof runtimeEnv];
}

export function getRuntimeEnv() {
  return runtimeEnv;
}

export function getMissingEnv(keys: string[]): string[] {
  return keys.filter((key) => {
    const value = getEnvValue(key);
    return !value || !String(value).trim();
  });
}

export function requireFeatureEnv(feature: RuntimeFeatureKey, fallbackMessage?: string) {
  const missing = getMissingEnv(featureRequirements[feature]);
  if (missing.length > 0) {
    throw new Error(fallbackMessage ?? `Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function getFeatureAvailability() {
  const missingCampaignEnv = getMissingEnv(featureRequirements.campaigns);
  const missingAuctionEnv = getMissingEnv(featureRequirements.auctions);
  const missingPinataEnv = getMissingEnv(featureRequirements.pinata);
  const missingAiEnv = getMissingEnv(featureRequirements.ai);

  return {
    network: runtimeEnv.NEXT_PUBLIC_ALEO_NETWORK,
    rpcUrl: runtimeEnv.NEXT_PUBLIC_ALEO_RPC_URL,
    pinataGateway: runtimeEnv.NEXT_PUBLIC_PINATA_GATEWAY,
    campaignTransactionsReady: missingCampaignEnv.length === 0,
    auctionTransactionsReady: missingAuctionEnv.length === 0,
    pinataReady: missingPinataEnv.length === 0,
    aiReady: missingAiEnv.length === 0,
    missing: {
      campaigns: missingCampaignEnv,
      auctions: missingAuctionEnv,
      pinata: missingPinataEnv,
      ai: missingAiEnv,
    },
  };
}
