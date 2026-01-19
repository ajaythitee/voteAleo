'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Vote,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign, CampaignMetadata } from '@/types';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

type FilterType = 'all' | 'active' | 'ended' | 'upcoming';

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useWalletStore();

  // Fetch campaigns from blockchain using Aleoscan API
  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all campaigns directly from Aleoscan API
      const allCampaigns = await aleoService.fetchAllCampaigns();
      console.log('Fetched campaigns from Aleoscan:', allCampaigns);

      if (allCampaigns.length === 0) {
        // Fallback: try fetching by counter
        const campaignCount = await aleoService.getCampaignCount();
        console.log('Campaign count from counter:', campaignCount);

        if (campaignCount === 0) {
          setCampaigns([]);
          setIsLoading(false);
          return;
        }

        const loadedCampaigns: Campaign[] = [];

        // Fetch each campaign by ID
        for (let i = 1; i <= campaignCount; i++) {
          try {
            const onChainCampaign = await aleoService.fetchCampaign(i);
            console.log(`Campaign ${i} raw data:`, onChainCampaign);

            if (onChainCampaign) {
              const campaignData = parseOnChainCampaign(onChainCampaign, i);
              if (campaignData) {
                loadedCampaigns.push(campaignData);
              }
            }
          } catch (campaignError) {
            console.warn(`Could not fetch campaign ${i}:`, campaignError);
          }
        }

        setCampaigns(loadedCampaigns);
      } else {
        // Parse campaigns from Aleoscan response
        const loadedCampaigns: Campaign[] = [];

        for (const entry of allCampaigns) {
          try {
            // Extract campaign ID from key (e.g., "1u64" -> 1)
            const idMatch = entry.id.match(/(\d+)/);
            const id = idMatch ? parseInt(idMatch[1]) : 0;

            if (id > 0) {
              const campaignData = parseOnChainCampaign(entry.data, id);
              if (campaignData) {
                loadedCampaigns.push(campaignData);
              }
            }
          } catch (err) {
            console.warn('Error parsing campaign entry:', entry, err);
          }
        }

        setCampaigns(loadedCampaigns);
      }
    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load campaigns from blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse on-chain campaign data
  const parseOnChainCampaign = (data: any, id: number): Campaign | null => {
    try {
      // Handle if data is a string (raw mapping value)
      if (typeof data === 'string') {
        // Parse the Aleo struct format: { creator: address, metadata_hash: field, ... }
        const parsed = parseAleoStruct(data);
        if (!parsed) return null;

        return {
          id: String(id),
          title: `Campaign #${id}`,
          description: 'Campaign on VoteAleo',
          imageUrl: '/images/default-campaign.jpg',
          creator: parsed.creator || '',
          startTime: new Date(Number(parsed.start_time || 0) * 1000),
          endTime: new Date(Number(parsed.end_time || 0) * 1000),
          options: Array.from({ length: Number(parsed.option_count || 2) }, (_, idx) => ({
            id: String(idx),
            label: `Option ${idx + 1}`,
            voteCount: Number(parsed[`votes_${idx}`] || 0),
          })),
          totalVotes: Number(parsed.total_votes || 0),
          isActive: parsed.is_active === 'true',
          createdAt: new Date(),
          onChainId: id,
          metadataHash: parsed.metadata_hash,
        };
      }

      // If it's already an object
      return {
        id: String(id),
        title: data.title || `Campaign #${id}`,
        description: data.description || 'Campaign on VoteAleo',
        imageUrl: data.imageUrl || '/images/default-campaign.jpg',
        creator: data.creator || '',
        startTime: new Date(Number(data.start_time || data.startTime || 0) * 1000),
        endTime: new Date(Number(data.end_time || data.endTime || 0) * 1000),
        options: data.options || [],
        totalVotes: Number(data.total_votes || data.totalVotes || 0),
        isActive: data.is_active || data.isActive || false,
        createdAt: new Date(),
        onChainId: id,
        metadataHash: data.metadata_hash || data.metadataHash,
      };
    } catch (err) {
      console.error('Error parsing campaign:', err);
      return null;
    }
  };

  // Parse Aleo struct string format
  const parseAleoStruct = (str: string): Record<string, string> | null => {
    try {
      // Remove outer braces and whitespace
      const content = str.replace(/^\s*\{|\}\s*$/g, '').trim();
      if (!content) return null;

      const result: Record<string, string> = {};

      // Split by comma, but respect nested structures
      const pairs = content.split(',').map(p => p.trim());

      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) continue;

        const key = pair.substring(0, colonIdx).trim();
        let value = pair.substring(colonIdx + 1).trim();

        // Remove type suffixes like u64, u8, field, etc.
        value = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();

        result[key] = value;
      }

      return result;
    } catch {
      return null;
    }
  };

  // Fetch campaign metadata from IPFS
  const fetchCampaignMetadata = async (metadataHash: string): Promise<CampaignMetadata | null> => {
    try {
      if (!metadataHash) return null;

      // Convert field hash to CID if needed
      // The metadata_hash stored on-chain should be a CID or convertible to one
      const cid = metadataHash.replace(/field$/, '');

      // Fetch from Pinata gateway
      const metadata = await pinataService.fetchJSON<CampaignMetadata>(cid);
      return metadata;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const getCampaignStatus = (campaign: Campaign) => {
    const now = new Date();
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());

    const status = getCampaignStatus(campaign);
    const matchesFilter = filter === 'all' || status === filter;

    return matchesSearch && matchesFilter;
  });

  const filterOptions: { value: FilterType; label: string; icon: any }[] = [
    { value: 'all', label: 'All', icon: Vote },
    { value: 'active', label: 'Active', icon: Clock },
    { value: 'upcoming', label: 'Upcoming', icon: Calendar },
    { value: 'ended', label: 'Ended', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
            <p className="text-white/60">
              Browse and participate in active voting campaigns
            </p>
          </div>

          <div className="flex gap-3">
            <GlassButton
              onClick={loadCampaigns}
              icon={<RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />}
              variant="secondary"
            >
              Refresh
            </GlassButton>

            {isConnected && (
              <Link href="/create">
                <GlassButton icon={<Plus className="w-5 h-5" />}>
                  Create Campaign
                </GlassButton>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <GlassInput
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>

          <div className="flex gap-2">
            {filterOptions.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl
                  transition-all duration-300
                  ${filter === option.value
                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <option.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <GlassCard className="p-6 mb-8 border-red-500/30">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadCampaigns}
              className="mt-2 text-sm text-indigo-400 hover:underline"
            >
              Try again
            </button>
          </GlassCard>
        )}

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Vote className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No campaigns found
            </h3>
            <p className="text-white/60 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : campaigns.length === 0
                  ? 'No campaigns have been created yet. Be the first to create one!'
                  : 'No campaigns match your filter criteria'}
            </p>
            {isConnected && (
              <Link href="/create">
                <GlassButton icon={<Plus className="w-5 h-5" />}>
                  Create Campaign
                </GlassButton>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign, index) => (
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

  // Handle image error - use placeholder
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800';
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
              <div className="w-full h-full flex items-center justify-center">
                <Vote className="w-16 h-16 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Status Badge */}
            <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label}
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

            {/* Vote Button */}
            {status === 'active' && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-400">Cast your vote</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
}
