'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle,
  Vote,
  Calendar,
  ArrowRight,
  RefreshCw,
  Wallet,
  History,
  Eye,
  EyeOff,
  Gavel,
  Search,
  User,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign } from '@/types';
import { aleoService } from '@/services/aleo';
import { parseOnChainCampaign } from '@/services/campaignParser';
import { auctionService } from '@/services/auction';
import { pinataService } from '@/services/pinata';
import { formatDistanceToNow, isPast, format } from 'date-fns';

interface VoteHistory {
  campaign: Campaign;
  votedAt: Date;
  hasVoted: boolean;
}

type AuctionData = {
  starting_bid?: number;
  name?: string;
  item?: { offchain_data?: string[] };
};

type AuctionHistoryItem = {
  auctionId: string;
  index: number;
  data: AuctionData;
  owner: string | null;
  meta?: { name?: string; description?: string; imageUrl?: string };
};

export default function HistoryPage() {
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [auctionHistory, setAuctionHistory] = useState<AuctionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyVoted, setShowOnlyVoted] = useState(false);
  const [showCreatedByMe, setShowCreatedByMe] = useState(false);
  const [tab, setTab] = useState<'all' | 'voting' | 'auctions'>('all');
  const [query, setQuery] = useState('');

  const { publicKey, connected } = useWallet();
  const { isConnected } = useWalletStore();
  const walletConnected = connected || isConnected;
  const address = publicKey;

  // Load all ended campaigns and check voting status
  const loadVoteHistory = async () => {
    if (!address) {
      setVoteHistory([]);
      setIsLoadingVotes(false);
      return;
    }

    setIsLoadingVotes(true);
    setError(null);

    try {
      const campaigns = await aleoService.fetchAllCampaigns();
      console.log('All campaigns for history:', campaigns);

      const historyList: VoteHistory[] = [];
      const campaignList: Campaign[] = [];

      for (const entry of campaigns) {
        try {
          const idMatch = entry.id.match(/(\d+)/);
          const id = idMatch ? parseInt(idMatch[1]) : 0;

          if (id > 0 && typeof entry.data === 'string') {
            const campaignData = await parseOnChainCampaign(entry.data as string, id);
            if (campaignData) {
              campaignList.push(campaignData);

              // Check if user has voted (using hash of address and campaign ID)
              const addressHash = aleoService.hashToField(address);
              const hasVoted = await aleoService.hasVoted(id, addressHash);

              historyList.push({
                campaign: campaignData,
                votedAt: campaignData.endTime, // We don't have exact vote time
                hasVoted,
              });
            }
          }
        } catch (err) {
          console.warn('Error parsing campaign entry:', entry, err);
        }
      }

      // Sort by end time (most recent first)
      historyList.sort((a, b) => b.campaign.endTime.getTime() - a.campaign.endTime.getTime());

      setAllCampaigns(campaignList);
      setVoteHistory(historyList);
    } catch (err: any) {
      console.error('Error loading vote history:', err);
      setError('Failed to load voting history');
    } finally {
      setIsLoadingVotes(false);
    }
  };

  const loadAuctionHistory = async () => {
    if (!address) {
      setAuctionHistory([]);
      setIsLoadingAuctions(false);
      return;
    }
    setIsLoadingAuctions(true);
    try {
      const items = await auctionService.listPublicAuctions();
      const enriched: AuctionHistoryItem[] = await Promise.all(
        items.slice(0, 80).map(async (a) => {
          const raw = (a.data || {}) as AuctionData;
          const owner = await auctionService.getAuctionOwner(a.auctionId);
          const off = raw?.item?.offchain_data;
          let meta: AuctionHistoryItem['meta'] | undefined = undefined;
          if (off && off.length >= 2) {
            const cid = aleoService.decodeFieldsToCid(String(off[0]), String(off[1]));
            if (cid) {
              try {
                const json = await pinataService.fetchJSON<Record<string, unknown>>(cid);
                const imageCid = typeof json.imageCid === 'string' ? json.imageCid : '';
                meta = {
                  name: typeof json.name === 'string' ? json.name : undefined,
                  description: typeof json.description === 'string' ? json.description : undefined,
                  imageUrl: imageCid ? pinataService.getGatewayUrl(imageCid) : undefined,
                };
              } catch {
                // ignore
              }
            }
          }
          return { auctionId: a.auctionId, index: a.index, data: raw, owner, meta };
        })
      );
      setAuctionHistory(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAuctions(false);
    }
  };

  useEffect(() => {
    if (walletConnected && address) {
      loadVoteHistory();
      loadAuctionHistory();
    } else {
      setIsLoadingVotes(false);
      setIsLoadingAuctions(false);
    }
  }, [walletConnected, address]);

  const normalizedQ = query.trim().toLowerCase();
  const filteredVotes = (showOnlyVoted ? voteHistory.filter((h) => h.hasVoted) : voteHistory).filter((h) =>
    normalizedQ ? h.campaign.title.toLowerCase().includes(normalizedQ) : true
  );

  const filteredAuctions = (showCreatedByMe && address
    ? auctionHistory.filter((a) => a.owner && a.owner.toLowerCase() === address.toLowerCase())
    : auctionHistory
  ).filter((a) => {
    if (!normalizedQ) return true;
    const name = (a.meta?.name || a.data?.name || 'Untitled').toLowerCase();
    return name.includes(normalizedQ);
  });

  const endedCampaigns = filteredVotes.filter((h) => isPast(h.campaign.endTime));
  const votedCount = voteHistory.filter(h => h.hasVoted).length;
  const isLoading = isLoadingVotes || isLoadingAuctions;

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
              Connect your wallet to view your voting history.
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
            <h1 className="text-3xl font-bold text-white mb-2">History</h1>
            <p className="text-white/60">
              Voting + auctions, all in one place
            </p>
          </div>

          <div className="flex gap-3">
            <GlassButton
              onClick={() => {
                loadVoteHistory();
                loadAuctionHistory();
              }}
              icon={<RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />}
              variant="secondary"
            >
              Refresh
            </GlassButton>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
              <Search className="w-4 h-4 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full bg-transparent outline-none text-sm text-white/80 placeholder:text-white/35"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton variant={tab === 'all' ? 'default' : 'secondary'} onClick={() => setTab('all')}>
              All
            </GlassButton>
            <GlassButton variant={tab === 'voting' ? 'default' : 'secondary'} onClick={() => setTab('voting')} icon={<Vote className="w-4 h-4" />}>
              Voting
            </GlassButton>
            <GlassButton variant={tab === 'auctions' ? 'default' : 'secondary'} onClick={() => setTab('auctions')} icon={<Gavel className="w-4 h-4" />}>
              Auctions
            </GlassButton>
            {(tab === 'all' || tab === 'voting') && (
              <GlassButton
                onClick={() => setShowOnlyVoted(!showOnlyVoted)}
                icon={showOnlyVoted ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                variant="secondary"
              >
                {showOnlyVoted ? 'Show all votes' : 'Voted only'}
              </GlassButton>
            )}
            {(tab === 'all' || tab === 'auctions') && (
              <GlassButton
                onClick={() => setShowCreatedByMe(!showCreatedByMe)}
                icon={<User className="w-4 h-4" />}
                variant="secondary"
              >
                {showCreatedByMe ? 'All auctions' : 'Created by me'}
              </GlassButton>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Vote className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{votedCount}</p>
                <p className="text-xs text-white/50">Votes Cast</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{endedCampaigns.length}</p>
                <p className="text-xs text-white/50">Completed</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <History className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{auctionHistory.length}</p>
                <p className="text-xs text-white/50">Public Auctions</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {allCampaigns.length > 0
                    ? Math.round((votedCount / allCampaigns.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-white/50">Participation</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Error Message */}
        {error && (
          <GlassCard className="p-6 mb-8 border-red-500/30">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadVoteHistory}
              className="mt-2 text-sm text-emerald-400 hover:underline"
            >
              Try again
            </button>
          </GlassCard>
        )}

        {/* Privacy Note */}
        <GlassCard className="p-4 mb-8 border-emerald-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <EyeOff className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-white/80">
                <strong className="text-emerald-400">Privacy Preserved:</strong> Your vote choices are completely anonymous.
                We can only verify if you participated, not how you voted.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* History List */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (tab === 'all' ? (filteredVotes.length + filteredAuctions.length === 0) : tab === 'voting' ? filteredVotes.length === 0 : filteredAuctions.length === 0) ? (
          <GlassCard className="p-12 text-center">
            <History className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nothing to show
            </h3>
            <p className="text-white/60 mb-6">
              Try changing filters, or browse campaigns/auctions.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/campaigns">
                <GlassButton icon={<Vote className="w-5 h-5" />}>Browse Campaigns</GlassButton>
              </Link>
              <Link href="/auctions">
                <GlassButton variant="secondary" icon={<Gavel className="w-5 h-5" />}>Browse Auctions</GlassButton>
              </Link>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {(tab === 'all' || tab === 'voting') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white/70">Voting</h2>
                  <Link href="/campaigns" className="text-xs text-emerald-400 hover:underline">Browse</Link>
                </div>
                {filteredVotes.map((item) => (
                  <HistoryCard key={`v-${item.campaign.id}`} item={item} />
                ))}
              </div>
            )}
            {(tab === 'all' || tab === 'auctions') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white/70">Auctions</h2>
                  <Link href="/auctions" className="text-xs text-emerald-400 hover:underline">Browse</Link>
                </div>
                {filteredAuctions.map((a) => (
                  <AuctionHistoryCard key={`a-${a.auctionId}`} item={a} address={address || ''} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ item }: { item: VoteHistory }) {
  const { campaign, hasVoted } = item;
  const isEnded = isPast(campaign.endTime);

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <GlassCard hover className="p-4">
        <div className="flex items-center gap-4">
          {/* Image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/[0.06] flex-shrink-0">
              <img
                src={campaign.imageUrl || '/images/default-campaign.svg'}
                alt={campaign.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/images/default-campaign.svg';
                }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-white truncate">
                  {campaign.title}
                </h3>
                {hasVoted && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                    <CheckCircle className="w-3 h-3" />
                    Voted
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 truncate mb-2">
                {campaign.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {isEnded
                    ? `Ended ${format(campaign.endTime, 'MMM d, yyyy')}`
                    : `Ends ${format(campaign.endTime, 'MMM d, yyyy')}`
                  }
                </span>
                <span className="flex items-center gap-1">
                  <Vote className="w-3 h-3" />
                  {campaign.totalVotes} votes
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              {isEnded ? (
                <span className="px-3 py-1.5 rounded-full text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30">
                  Results Available
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                  Active
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-white/30" />
            </div>
          </div>
        </GlassCard>
    </Link>
  );
}

function AuctionHistoryCard({ item, address }: { item: AuctionHistoryItem; address: string }) {
  const name = item.meta?.name || (item.data?.name != null ? String(item.data.name) : 'Untitled');
  const startingBid = Number(item.data?.starting_bid) || 0;
  const mine = !!(item.owner && address && item.owner.toLowerCase() === address.toLowerCase());

  return (
    <Link href={`/auctions/${encodeURIComponent(item.auctionId)}`}>
      <GlassCard hover className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/[0.06] flex-shrink-0">
            {item.meta?.imageUrl ? (
              <img src={item.meta.imageUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gavel className="w-6 h-6 text-white/25" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white truncate">{name}</h3>
              {mine && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3" />
                  Created by you
                </span>
              )}
            </div>
            {item.meta?.description ? (
              <p className="text-sm text-white/60 truncate mb-2">{item.meta.description}</p>
            ) : null}
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <Gavel className="w-3 h-3" />
                Starting: {startingBid} credits
              </span>
              <span className="flex items-center gap-1 font-mono">
                #{item.index}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
              Open
            </span>
            <ArrowRight className="w-4 h-4 text-white/30" />
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
