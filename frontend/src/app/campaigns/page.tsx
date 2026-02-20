'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { PageShell, Section, EmptyState } from '@/components/layout';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign } from '@/types';
import { aleoService } from '@/services/aleo';
import { parseOnChainCampaign } from '@/services/campaignParser';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

type FilterType = 'all' | 'active' | 'ended' | 'upcoming';
const CATEGORY_OPTIONS = ['', 'governance', 'community', 'poll', 'dao', 'other'] as const;

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useWalletStore();

  // Fetch campaigns from blockchain using on-chain mappings (no Aleoscan dependency)
  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get total campaign count from on-chain mapping
      const campaignCount = await aleoService.getCampaignCount();
      console.log('Campaign count from counter:', campaignCount);

      if (campaignCount === 0) {
        setCampaigns([]);
        setIsLoading(false);
        return;
      }

      const loadedCampaigns: Campaign[] = [];

      // Fetch each campaign directly from the Provable RPC by ID
      for (let i = 1; i <= campaignCount; i++) {
        try {
          const onChainCampaign = await aleoService.fetchCampaign(i);
          console.log(`Campaign ${i} raw data:`, onChainCampaign);

          if (onChainCampaign) {
            const campaignData = await parseOnChainCampaign(onChainCampaign as string, i);
            if (campaignData) {
              loadedCampaigns.push(campaignData);
            }
          }
        } catch (campaignError) {
          console.warn(`Could not fetch campaign ${i}:`, campaignError);
        }
      }

      setCampaigns(loadedCampaigns);
    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load campaigns from blockchain');
    } finally {
      setIsLoading(false);
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
    const matchesCategory =
      !categoryFilter || (campaign.category?.toLowerCase() ?? '') === categoryFilter.toLowerCase();

    return matchesSearch && matchesFilter && matchesCategory;
  });

  const filterOptions: { value: FilterType; label: string; icon: any }[] = [
    { value: 'all', label: 'All', icon: Vote },
    { value: 'active', label: 'Active', icon: Clock },
    { value: 'upcoming', label: 'Upcoming', icon: Calendar },
    { value: 'ended', label: 'Ended', icon: CheckCircle },
  ];

  return (
    <PageShell
      title="Campaigns"
      description="Browse and participate in active voting campaigns."
      actions={
        <>
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
                Create campaign
              </GlassButton>
            </Link>
          )}
        </>
      }
      maxWidth="7xl"
    >
      <Section
        title="Find a campaign"
        description="Filter by status or category, or search by name."
      >
        <div className="flex flex-col sm:flex-row gap-4" aria-label="Filters">
          <div className="flex-1">
            <GlassInput
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl border
                  transition-colors text-sm
                  ${filter === option.value
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }
                `}
              >
                <option.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/[0.1] text-white/80 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm"
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.filter(Boolean).map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {error && (
        <GlassCard className="p-6 border border-red-500/40 bg-red-500/5">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={loadCampaigns}
            className="mt-2 text-xs text-emerald-400 hover:underline"
          >
            Try again
          </button>
        </GlassCard>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          title="No campaigns found"
          description={
            searchQuery
              ? 'Try adjusting your search or filters.'
              : campaigns.length === 0
                ? 'No campaigns have been created yet. Be the first to launch one.'
                : 'No campaigns match your current filters.'
          }
          icon={<Vote className="w-10 h-10" />}
          action={
            isConnected ? (
              <Link href="/create">
                <GlassButton icon={<Plus className="w-5 h-5" />}>
                  Create campaign
                </GlassButton>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
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
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
    e.currentTarget.src = '/images/default-campaign.svg';
  };

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <GlassCard hover className="h-full flex flex-col overflow-hidden p-0">
          {/* Image */}
          <div className="relative h-48 overflow-hidden bg-emerald-500/10">
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
            <div className="absolute top-4 right-4">
              <Badge variant={status} icon={<StatusIcon className="w-3.5 h-3.5" />}>
                {config.label}
              </Badge>
            </div>
            {/* Category Badge */}
            {campaign.category && (
              <div className="absolute top-4 left-4">
                <Badge variant="category">
                  {campaign.category.charAt(0).toUpperCase() + campaign.category.slice(1)}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col flex-1">
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {campaign.title}
            </h3>
            <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">
              {campaign.description}
            </p>

            {/* Quorum */}
            {campaign.minVotes != null && campaign.minVotes > 0 && (
              <div className="text-xs mb-2">
                <span className="text-white/50">Quorum: {campaign.minVotes} votes</span>
                {campaign.totalVotes >= campaign.minVotes ? (
                  <span className="ml-2 text-green-400">Reached</span>
                ) : (
                  <span className="ml-2 text-amber-400">{campaign.minVotes - campaign.totalVotes} more needed</span>
                )}
              </div>
            )}

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
                  <span className="text-sm text-emerald-400">Cast your vote</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            )}
          </div>
      </GlassCard>
    </Link>
  );
}
