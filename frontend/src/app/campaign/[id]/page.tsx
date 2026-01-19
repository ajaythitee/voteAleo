'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  Vote,
  Shield,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
import { createTransaction, EventType, requestCreateEvent, getProgramId } from '@/utils/transaction';
import { Campaign, VotingOption, CampaignMetadata } from '@/types';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { publicKey, requestTransaction, wallet, connected } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();

  // Use wallet adapter connection state
  const walletConnected = connected || isConnected;
  const address = publicKey;

  // Parse on-chain campaign data
  const parseOnChainCampaign = (data: any, id: number): Campaign | null => {
    try {
      if (typeof data === 'string') {
        // Parse the Aleo struct format
        const content = data.replace(/^\s*\{|\}\s*$/g, '').trim();
        if (!content) return null;

        const result: Record<string, string> = {};
        const pairs = content.split(',').map(p => p.trim());

        for (const pair of pairs) {
          const colonIdx = pair.indexOf(':');
          if (colonIdx === -1) continue;
          const key = pair.substring(0, colonIdx).trim();
          let value = pair.substring(colonIdx + 1).trim();
          value = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();
          result[key] = value;
        }

        return {
          id: String(id),
          title: `Campaign #${id}`,
          description: 'Campaign on VoteAleo',
          imageUrl: '',
          creator: result.creator || '',
          startTime: new Date(Number(result.start_time || 0) * 1000),
          endTime: new Date(Number(result.end_time || 0) * 1000),
          options: Array.from({ length: Number(result.option_count || 2) }, (_, idx) => ({
            id: String(idx),
            label: `Option ${idx + 1}`,
            voteCount: Number(result[`votes_${idx}`] || 0),
          })),
          totalVotes: Number(result.total_votes || 0),
          isActive: result.is_active === 'true',
          createdAt: new Date(),
          onChainId: id,
          metadataHash: result.metadata_hash,
        };
      }

      return {
        id: String(id),
        title: data.title || `Campaign #${id}`,
        description: data.description || 'Campaign on VoteAleo',
        imageUrl: data.imageUrl || '',
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

  // Fetch campaign metadata from IPFS
  const fetchCampaignMetadata = async (metadataHash: string): Promise<CampaignMetadata | null> => {
    try {
      if (!metadataHash) return null;
      const cid = metadataHash.replace(/field$/, '');
      const metadata = await pinataService.fetchJSON<CampaignMetadata>(cid);
      return metadata;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const loadCampaign = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const id = parseInt(campaignId);
        if (isNaN(id)) {
          throw new Error('Invalid campaign ID');
        }

        // Fetch from blockchain
        const onChainData = await aleoService.fetchCampaign(id);

        if (!onChainData) {
          throw new Error('Campaign not found');
        }

        const campaignData = parseOnChainCampaign(onChainData, id);

        if (!campaignData) {
          throw new Error('Failed to parse campaign data');
        }

        // Try to fetch metadata from IPFS
        if (campaignData.metadataHash) {
          try {
            const metadata = await fetchCampaignMetadata(campaignData.metadataHash);
            if (metadata) {
              campaignData.title = metadata.title || campaignData.title;
              campaignData.description = metadata.description || campaignData.description;
              if (metadata.imageCid) {
                campaignData.imageUrl = pinataService.getGatewayUrl(metadata.imageCid);
              }
              if (metadata.options) {
                campaignData.options = metadata.options.map((label, idx) => ({
                  id: String(idx),
                  label,
                  voteCount: campaignData.options[idx]?.voteCount || 0,
                  percentage: campaignData.totalVotes > 0
                    ? Math.round((campaignData.options[idx]?.voteCount || 0) / campaignData.totalVotes * 100)
                    : 0,
                }));
              }
            }
          } catch (metadataError) {
            console.warn('Could not fetch metadata:', metadataError);
          }
        }

        // Calculate percentages
        if (campaignData.totalVotes > 0) {
          campaignData.options = campaignData.options.map(opt => ({
            ...opt,
            percentage: Math.round((opt.voteCount / campaignData.totalVotes) * 100),
          }));
        }

        setCampaign(campaignData);
      } catch (err: any) {
        console.error('Error loading campaign:', err);
        setError(err.message || 'Failed to load campaign');
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId]);

  const getCampaignStatus = () => {
    if (!campaign) return 'loading';
    const now = new Date();
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  };

  const status = getCampaignStatus();

  const handleVote = async () => {
    if (selectedOption === null || !campaign) return;

    if (!address) {
      showError('Wallet Error', 'Please connect your wallet first');
      return;
    }

    setShowConfirmModal(false);
    setIsVoting(true);

    try {
      const campaignIdNum = campaign.onChainId || parseInt(campaign.id);
      const timestamp = Math.floor(Date.now() / 1000);

      // Format inputs for Aleo
      const inputs = aleoService.formatCastVoteInputs(campaignIdNum, selectedOption, timestamp);

      const walletName = wallet?.adapter?.name;
      console.log('Voting with wallet:', walletName);
      console.log('Vote inputs:', inputs);

      let result;

      if (walletName === 'Puzzle Wallet') {
        // Use Puzzle Wallet SDK
        const puzzleParams = {
          type: EventType.Execute,
          programId: getProgramId(),
          functionId: 'cast_vote',
          fee: 0.3, // Fee in credits for Puzzle
          inputs,
        };
        result = await createTransaction(puzzleParams, requestCreateEvent, walletName);
      } else {
        // Use Leo Wallet adapter
        const leoParams = {
          publicKey: address,
          functionName: 'cast_vote',
          inputs,
          fee: 300000, // Fee in microcredits for Leo
          feePrivate: false,
        };
        result = await createTransaction(leoParams, requestTransaction, walletName);
      }

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      setHasVoted(true);
      success('Vote Cast!', 'Your anonymous vote has been recorded on the blockchain');

      // Refresh campaign data after a short delay to allow blockchain confirmation
      setTimeout(async () => {
        try {
          const id = parseInt(campaignId);
          const onChainData = await aleoService.fetchCampaign(id);
          if (onChainData) {
            const updatedCampaign = parseOnChainCampaign(onChainData, id);
            if (updatedCampaign && campaign) {
              // Preserve metadata from previous state
              updatedCampaign.title = campaign.title;
              updatedCampaign.description = campaign.description;
              updatedCampaign.imageUrl = campaign.imageUrl;
              setCampaign(updatedCampaign);
            }
          }
        } catch (refreshErr) {
          console.warn('Could not refresh campaign data:', refreshErr);
        }
      }, 3000);
    } catch (err: any) {
      console.error('Vote error:', err);
      showError('Vote Failed', err.message || 'Transaction failed');
    } finally {
      setIsVoting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <GlassCard className="p-12">
            <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">
              {error || 'Campaign Not Found'}
            </h2>
            <p className="text-white/60 mb-6">
              The campaign you're looking for doesn't exist or could not be loaded.
            </p>
            <Link href="/campaigns">
              <GlassButton icon={<ArrowLeft className="w-5 h-5" />}>
                Back to Campaigns
              </GlassButton>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  const statusConfig = {
    active: {
      label: 'Active',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
    },
    upcoming: {
      label: 'Upcoming',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    ended: {
      label: 'Ended',
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    },
    loading: {
      label: 'Loading',
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    },
  };

  // Handle image error - use placeholder
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800';
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Campaigns
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Header */}
            <GlassCard className="overflow-hidden p-0">
              {/* Image */}
              <div className="relative h-64 sm:h-80 bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                {campaign.imageUrl ? (
                  <img
                    src={campaign.imageUrl}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Vote className="w-24 h-24 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-medium border ${statusConfig[status].color}`}>
                  {statusConfig[status].label}
                </div>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {campaign.title}
                  </h1>
                  <div className="flex items-center gap-4 text-white/60 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {campaign.totalVotes} votes
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created {format(campaign.createdAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-3">About this Campaign</h2>
                <p className="text-white/70 leading-relaxed">{campaign.description}</p>
              </div>
            </GlassCard>

            {/* Voting Options */}
            <GlassCard>
              <h2 className="text-lg font-semibold text-white mb-6">
                {status === 'ended' ? 'Final Results' : 'Cast Your Vote'}
              </h2>

              {hasVoted ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-white mb-2">Vote Submitted!</h3>
                  <p className="text-white/60">
                    Your anonymous vote has been recorded on the blockchain.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaign.options.map((option, index) => (
                    <VoteOptionCard
                      key={option.id}
                      option={option}
                      index={index}
                      isSelected={selectedOption === index}
                      onSelect={() => status === 'active' && !hasVoted && setSelectedOption(index)}
                      showResults={status === 'ended'}
                      disabled={status !== 'active' || hasVoted}
                    />
                  ))}
                </div>
              )}

              {/* Vote Button */}
              {status === 'active' && !hasVoted && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-indigo-400 font-medium mb-1">Anonymous Voting</p>
                      <p className="text-white/60">
                        Your vote is protected by zero-knowledge proofs. No one can see how you voted.
                      </p>
                    </div>
                  </div>

                  {walletConnected ? (
                    <GlassButton
                      fullWidth
                      size="lg"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={selectedOption === null}
                      loading={isVoting}
                      icon={<Vote className="w-5 h-5" />}
                    >
                      {selectedOption === null ? 'Select an option to vote' : 'Submit Vote'}
                    </GlassButton>
                  ) : (
                    <GlassButton fullWidth size="lg" variant="secondary" disabled>
                      Connect Wallet to Vote
                    </GlassButton>
                  )}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Time Info */}
            <GlassCard>
              <h3 className="font-semibold text-white mb-4">Voting Period</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-white/50 text-sm mb-1">Starts</p>
                  <p className="text-white">{format(campaign.startTime, 'PPp')}</p>
                </div>
                <div>
                  <p className="text-white/50 text-sm mb-1">Ends</p>
                  <p className="text-white">{format(campaign.endTime, 'PPp')}</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-white/50 text-sm mb-1">Time Remaining</p>
                  <p className="text-lg font-semibold text-white">
                    {status === 'ended'
                      ? 'Voting has ended'
                      : status === 'upcoming'
                        ? `Starts ${formatDistanceToNow(campaign.startTime, { addSuffix: true })}`
                        : formatDistanceToNow(campaign.endTime, { addSuffix: true })
                    }
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Creator Info */}
            <GlassCard>
              <h3 className="font-semibold text-white mb-4">Created By</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {campaign.creator ? campaign.creator.slice(5, 7).toUpperCase() : '??'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-sm truncate">
                    {campaign.creator
                      ? `${campaign.creator.slice(0, 12)}...${campaign.creator.slice(-6)}`
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Share */}
            <GlassCard>
              <h3 className="font-semibold text-white mb-4">Share Campaign</h3>
              <GlassButton
                fullWidth
                variant="secondary"
                onClick={copyLink}
                icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              >
                {copied ? 'Link Copied!' : 'Copy Link'}
              </GlassButton>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Confirm Vote Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Your Vote"
        size="sm"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-white/50 text-sm mb-1">You are voting for:</p>
            <p className="text-white font-semibold">
              {selectedOption !== null ? campaign.options[selectedOption].label : ''}
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/70">
              This action cannot be undone. Your vote will be recorded anonymously on the blockchain.
            </p>
          </div>

          <div className="flex gap-3">
            <GlassButton
              variant="secondary"
              fullWidth
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              fullWidth
              onClick={handleVote}
              loading={isVoting}
              icon={<Vote className="w-5 h-5" />}
            >
              Confirm Vote
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function VoteOptionCard({
  option,
  index,
  isSelected,
  onSelect,
  showResults,
  disabled,
}: {
  option: VotingOption;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  showResults: boolean;
  disabled: boolean;
}) {
  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-xl
        transition-all duration-300
        ${disabled && !showResults ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected
          ? 'vote-option-selected'
          : 'vote-option'
        }
      `}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center
            ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-white/30'}
          `}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
          <span className="font-medium text-white">{option.label}</span>
        </div>

        {showResults && (
          <span className="text-white/70 font-semibold">
            {option.percentage || 0}%
          </span>
        )}
      </div>

      {showResults && (
        <div className="mt-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${option.percentage || 0}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
          </div>
          <p className="text-sm text-white/50 mt-2">{option.voteCount} votes</p>
        </div>
      )}
    </motion.button>
  );
}
