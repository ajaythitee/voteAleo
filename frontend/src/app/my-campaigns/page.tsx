'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Clock,
  Users,
  CheckCircle,
  Plus,
  Vote,
  Calendar,
  ArrowRight,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign, CampaignMetadata } from '@/types';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

export default function MyCampaignsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { publicKey, connected } = useWallet();
  const { isConnected } = useWalletStore();
  const walletConnected = connected || isConnected;
  const address = publicKey;

  // Fetch campaigns created by this user
  const loadMyCampaigns = async () => {
    if (!address) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allCampaigns = await aleoService.fetchAllCampaigns();
      console.log('All campaigns:', allCampaigns);

      const myCampaigns: Campaign[] = [];

      for (const entry of allCampaigns) {
        try {
          const idMatch = entry.id.match(/(\d+)/);
          const id = idMatch ? parseInt(idMatch[1]) : 0;

          if (id > 0 && typeof entry.data === 'string') {
            const parsed = parseAleoStruct(entry.data);
            if (parsed && parsed.creator === address) {
              const campaignData = await parseOnChainCampaign(entry.data, id);
              if (campaignData) {
                myCampaigns.push(campaignData);
              }
            }
          }
        } catch (err) {
          console.warn('Error parsing campaign entry:', entry, err);
        }
      }

      setCampaigns(myCampaigns);
    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load your campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const parseOnChainCampaign = async (data: string, id: number): Promise<Campaign | null> => {
    try {
      const parsed = parseAleoStruct(data);
      if (!parsed) return null;

      let title = `Campaign #${id}`;
      let description = 'Campaign on VoteAleo';
      const imageUrl = '/images/default-campaign.svg'; // Always use default image
      let options: { id: string; label: string; voteCount: number }[] = [];

      // Try to decode CID from on-chain fields and fetch metadata from IPFS
      const cidPart1 = parsed['metadata_cid.part1'];
      const cidPart2 = parsed['metadata_cid.part2'];

      if (cidPart1 && cidPart2) {
        try {
          const cid = aleoService.decodeFieldsToCid(
            cidPart1.includes('field') ? cidPart1 : cidPart1 + 'field',
            cidPart2.includes('field') ? cidPart2 : cidPart2 + 'field'
          );
          console.log(`Campaign ${id} decoded CID:`, cid);

          if (cid) {
            const metadata = await pinataService.fetchJSON<CampaignMetadata>(cid);
            if (metadata) {
              title = metadata.title || title;
              description = metadata.description || description;
              if (metadata.options) {
                options = metadata.options.map((label, idx) => ({
                  id: String(idx),
                  label,
                  voteCount: Number(parsed[`votes_${idx}`] || 0),
                }));
              }
            }
          }
        } catch (e) {
          console.warn(`Could not fetch metadata for campaign ${id}:`, e);
        }
      }

      // Generate default options if none found
      if (options.length === 0) {
        const optionCount = Number(parsed.option_count || 2);
        options = Array.from({ length: optionCount }, (_, idx) => ({
          id: String(idx),
          label: `Option ${idx + 1}`,
          voteCount: Number(parsed[`votes_${idx}`] || 0),
        }));
      }

      return {
        id: String(id),
        title,
        description,
        imageUrl,
        creator: parsed.creator || '',
        startTime: new Date(Number(parsed.start_time || 0) * 1000),
        endTime: new Date(Number(parsed.end_time || 0) * 1000),
        options,
        totalVotes: Number(parsed.total_votes || 0),
        isActive: parsed.is_active === 'true',
        createdAt: new Date(),
        onChainId: id,
      };
    } catch (err) {
      console.error('Error parsing campaign:', err);
      return null;
    }
  };

  const parseAleoStruct = (str: string): Record<string, string> | null => {
    try {
      const content = str.replace(/^\s*\{|\}\s*$/g, '').trim();
      if (!content) return null;

      const result: Record<string, string> = {};

      // Match key-value pairs, handling nested structs
      const regex = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*:\s*([^,}]+)/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        const key = match[1].trim();
        let value = match[2].trim();
        value = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();
        result[key] = value;
      }

      return result;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (walletConnected && address) {
      loadMyCampaigns();
    } else {
      setIsLoading(false);
    }
  }, [walletConnected, address]);

  const getCampaignStatus = (campaign: Campaign) => {
    const now = new Date();
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  };

  // Show connect wallet message if not connected
  if (!walletConnected) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-2xl mx-auto px-4">
          <GlassCard className="p-12 text-center">
            <Wallet className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-white/60 mb-6">
              Connect your wallet to view campaigns you've created.
            </p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Campaigns</h1>
            <p className="text-white/60">
              Campaigns you've created on VoteAleo
            </p>
          </div>

          <div className="flex gap-3">
            <GlassButton
              onClick={loadMyCampaigns}
              icon={<RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />}
              variant="secondary"
            >
              Refresh
            </GlassButton>

            <Link href="/create">
              <GlassButton icon={<Plus className="w-5 h-5" />}>
                Create Campaign
              </GlassButton>
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <GlassCard className="p-6 mb-8 border-red-500/30">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadMyCampaigns}
              className="mt-2 text-sm text-indigo-400 hover:underline"
            >
              Try again
            </button>
          </GlassCard>
        )}

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Vote className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-white/60 mb-6">
              You haven't created any campaigns yet. Create your first campaign to get started!
            </p>
            <Link href="/create">
              <GlassButton icon={<Plus className="w-5 h-5" />}>
                Create Campaign
              </GlassButton>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign, index) => (
              <CampaignCard key={campaign.id} campaign={campaign} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ campaign, index }: { campaign: Campaign; index: number }) {
  const status = getCampaignStatus(campaign);

  function getCampaignStatus(campaign: Campaign) {
    const now = new Date();
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  }

  const statusConfig = {
    active: {
      label: 'Active',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: Clock,
    },
    upcoming: {
      label: 'Upcoming',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: Calendar,
    },
    ended: {
      label: 'Ended',
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      icon: CheckCircle,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/images/default-campaign.svg';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/campaign/${campaign.id}`}>
        <GlassCard hover className="h-full flex flex-col overflow-hidden p-0">
          {/* Image */}
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            {campaign.imageUrl && campaign.imageUrl !== '/images/default-campaign.jpg' ? (
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <img
                src="/images/default-campaign.svg"
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Status Badge */}
            <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label}
            </div>

            {/* Creator Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              Your Campaign
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col flex-1">
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {campaign.title}
            </h3>
            <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">
              {campaign.description}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-white/50">
                <Users className="w-4 h-4" />
                <span>{campaign.totalVotes} votes</span>
              </div>

              <div className="flex items-center gap-2 text-white/50">
                <Clock className="w-4 h-4" />
                <span>
                  {status === 'ended'
                    ? `Ended ${formatDistanceToNow(campaign.endTime, { addSuffix: true })}`
                    : status === 'upcoming'
                      ? `Starts ${formatDistanceToNow(campaign.startTime, { addSuffix: true })}`
                      : `Ends ${formatDistanceToNow(campaign.endTime, { addSuffix: true })}`
                  }
                </span>
              </div>
            </div>

            {/* View Details */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-indigo-400">View details</span>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}
