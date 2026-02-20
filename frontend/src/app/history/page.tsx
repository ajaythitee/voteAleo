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
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign } from '@/types';
import { aleoService } from '@/services/aleo';
import { parseOnChainCampaign } from '@/services/campaignParser';
import { formatDistanceToNow, isPast, format } from 'date-fns';

interface VoteHistory {
  campaign: Campaign;
  votedAt: Date;
  hasVoted: boolean;
}

export default function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyVoted, setShowOnlyVoted] = useState(false);

  const { publicKey, connected } = useWallet();
  const { isConnected } = useWalletStore();
  const walletConnected = connected || isConnected;
  const address = publicKey;

  // Load all ended campaigns and check voting status
  const loadVoteHistory = async () => {
    if (!address) {
      setVoteHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletConnected && address) {
      loadVoteHistory();
    } else {
      setIsLoading(false);
    }
  }, [walletConnected, address]);

  const filteredHistory = showOnlyVoted
    ? voteHistory.filter(h => h.hasVoted)
    : voteHistory;

  const endedCampaigns = filteredHistory.filter(h => isPast(h.campaign.endTime));
  const votedCount = voteHistory.filter(h => h.hasVoted).length;

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
            <h1 className="text-3xl font-bold text-white mb-2">Voting History</h1>
            <p className="text-white/60">
              Track your participation in voting campaigns
            </p>
          </div>

          <div className="flex gap-3">
            <GlassButton
              onClick={() => setShowOnlyVoted(!showOnlyVoted)}
              icon={showOnlyVoted ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              variant="secondary"
            >
              {showOnlyVoted ? 'Show All' : 'Voted Only'}
            </GlassButton>

            <GlassButton
              onClick={loadVoteHistory}
              icon={<RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />}
              variant="secondary"
            >
              Refresh
            </GlassButton>
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
                <p className="text-2xl font-bold text-white">{allCampaigns.length}</p>
                <p className="text-xs text-white/50">Total Campaigns</p>
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
        ) : filteredHistory.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <History className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {showOnlyVoted ? 'No votes yet' : 'No campaigns found'}
            </h3>
            <p className="text-white/60 mb-6">
              {showOnlyVoted
                ? "You haven't voted in any campaigns yet. Browse active campaigns to participate!"
                : 'No campaigns available to display.'}
            </p>
            <Link href="/campaigns">
              <GlassButton icon={<Vote className="w-5 h-5" />}>
                Browse Campaigns
              </GlassButton>
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <HistoryCard key={item.campaign.id} item={item} />
            ))}
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
