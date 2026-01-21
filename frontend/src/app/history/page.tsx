'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { Campaign, CampaignMetadata } from '@/types';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
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
            const campaignData = await parseOnChainCampaign(entry.data, id);
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

  // Parse Aleo struct string format (handles nested structs)
  const parseAleoStruct = (str: string): Record<string, string> | null => {
    try {
      let content = str.replace(/^\s*\{|\}\s*$/g, '').trim();
      content = content.replace(/\n/g, ' ');
      if (!content) return null;

      const result: Record<string, string> = {};

      // Handle nested struct for metadata_cid: { part1: ..., part2: ... }
      const nestedMatch = content.match(/metadata_cid\s*:\s*\{\s*part1\s*:\s*(\d+)field\s*,\s*part2\s*:\s*(\d+)field\s*\}/i);
      if (nestedMatch) {
        result['metadata_cid.part1'] = nestedMatch[1] + 'field';
        result['metadata_cid.part2'] = nestedMatch[2] + 'field';
        content = content.replace(/metadata_cid\s*:\s*\{[^}]+\}/i, '');
      } else {
        // Try to extract fields directly if nested parsing fails
        const part1Match = content.match(/part1\s*:\s*(\d+)field/i);
        const part2Match = content.match(/part2\s*:\s*(\d+)field/i);
        if (part1Match && part2Match) {
          result['metadata_cid.part1'] = part1Match[1] + 'field';
          result['metadata_cid.part2'] = part2Match[1] + 'field';
        }
      }

      // Match simple key-value pairs
      const simpleRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,{}]+?)(?:,|$)/g;
      let match;

      while ((match = simpleRegex.exec(content)) !== null) {
        const key = match[1].trim();
        let value = match[2].trim();
        const cleanValue = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();
        result[key] = cleanValue;
      }

      return result;
    } catch {
      return null;
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
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Vote className="w-5 h-5 text-indigo-400" />
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
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
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
              className="mt-2 text-sm text-indigo-400 hover:underline"
            >
              Try again
            </button>
          </GlassCard>
        )}

        {/* Privacy Note */}
        <GlassCard className="p-4 mb-8 border-indigo-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <EyeOff className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-white/80">
                <strong className="text-indigo-400">Privacy Preserved:</strong> Your vote choices are completely anonymous.
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
            {filteredHistory.map((item, index) => (
              <HistoryCard key={item.campaign.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ item, index }: { item: VoteHistory; index: number }) {
  const { campaign, hasVoted } = item;
  const isEnded = isPast(campaign.endTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/campaign/${campaign.id}`}>
        <GlassCard hover className="p-4">
          <div className="flex items-center gap-4">
            {/* Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex-shrink-0">
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
    </motion.div>
  );
}
