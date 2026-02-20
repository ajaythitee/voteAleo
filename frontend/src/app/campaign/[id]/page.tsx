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
  Download,
  Share2,
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
import { relayerService } from '@/services/relayer';
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
  const [useGasless, setUseGasless] = useState(true); // Default to gasless
  const [lastVoteProof, setLastVoteProof] = useState<{ transactionId?: string; eventId?: string; address?: string } | null>(null);

  const { publicKey, requestTransaction, wallet, connected } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();

  // Use wallet adapter connection state
  const walletConnected = connected || isConnected;
  const address = publicKey;

  // Parse Aleo struct string format (handles nested structs)
  const parseAleoStruct = (str: string): Record<string, string> | null => {
    try {
      console.log('Parsing struct:', str.slice(0, 200) + '...');

      // Remove outer braces and newlines
      let content = str.replace(/^\s*\{|\}\s*$/g, '').trim();
      content = content.replace(/\n/g, ' ');
      if (!content) return null;

      const result: Record<string, string> = {};

      // Handle nested struct for metadata_cid: { part1: ..., part2: ... }
      const nestedMatch = content.match(/metadata_cid\s*:\s*\{\s*part1\s*:\s*(\d+)field\s*,\s*part2\s*:\s*(\d+)field\s*\}/i);
      if (nestedMatch) {
        result['metadata_cid.part1'] = nestedMatch[1] + 'field';
        result['metadata_cid.part2'] = nestedMatch[2] + 'field';
        console.log('Extracted CID parts:', {
          part1: result['metadata_cid.part1'].slice(0, 30) + '...',
          part2: result['metadata_cid.part2'].slice(0, 30) + '...'
        });
        // Remove the nested struct from content for further parsing
        content = content.replace(/metadata_cid\s*:\s*\{[^}]+\}/i, '');
      } else {
        // Try to extract fields directly if nested parsing fails
        const part1Match = content.match(/part1\s*:\s*(\d+)field/i);
        const part2Match = content.match(/part2\s*:\s*(\d+)field/i);
        if (part1Match && part2Match) {
          result['metadata_cid.part1'] = part1Match[1] + 'field';
          result['metadata_cid.part2'] = part2Match[1] + 'field';
          console.log('Extracted CID parts (alternative):', {
            part1: result['metadata_cid.part1'].slice(0, 30) + '...',
            part2: result['metadata_cid.part2'].slice(0, 30) + '...'
          });
        }
      }

      // Match simple key-value pairs
      const simpleRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,{}]+?)(?:,|$)/g;
      let match;

      while ((match = simpleRegex.exec(content)) !== null) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove type suffixes but keep the raw value
        const cleanValue = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();
        result[key] = cleanValue;
      }

      console.log('Parsed result keys:', Object.keys(result));
      return result;
    } catch (e) {
      console.error('Error parsing struct:', e);
      return null;
    }
  };

  // Parse on-chain campaign data and fetch metadata from IPFS
  const parseOnChainCampaign = async (data: any, id: number): Promise<Campaign | null> => {
    try {
      if (typeof data !== 'string') return null;

      const parsed = parseAleoStruct(data);
      if (!parsed) return null;

      let title = `Campaign #${id}`;
      let description = 'Campaign on VoteAleo';
      let imageUrl = '/images/default-campaign.svg';
      let options: { id: string; label: string; voteCount: number }[] = [];
      let minVotes: number | undefined;
      let category: string | undefined;

      // Decode CID from on-chain and fetch metadata from IPFS
      const cidPart1 = parsed['metadata_cid.part1'];
      const cidPart2 = parsed['metadata_cid.part2'];

      console.log(`Campaign ${id} CID parts:`, { cidPart1, cidPart2 });

      if (cidPart1 && cidPart2) {
        try {
          const part1WithSuffix = cidPart1.includes('field') ? cidPart1 : cidPart1 + 'field';
          const part2WithSuffix = cidPart2.includes('field') ? cidPart2 : cidPart2 + 'field';

          console.log(`Campaign ${id} decoding fields:`, { part1WithSuffix, part2WithSuffix });

          const cid = aleoService.decodeFieldsToCid(part1WithSuffix, part2WithSuffix);
          console.log(`Campaign ${id} decoded CID:`, cid);

          if (cid && cid.length > 10) {
            try {
              const metadata = await pinataService.fetchJSON<CampaignMetadata>(cid);
              console.log(`Campaign ${id} metadata from IPFS:`, metadata);

              if (metadata) {
                title = metadata.title || title;
                description = metadata.description || description;
                // Get image from IPFS if available
                if (metadata.imageCid) {
                  imageUrl = pinataService.getGatewayUrl(metadata.imageCid);
                  console.log(`Campaign ${id} image URL:`, imageUrl);
                }
                if (metadata.options && Array.isArray(metadata.options)) {
                  options = metadata.options.map((label, idx) => ({
                    id: String(idx),
                    label: typeof label === 'string' ? label : `Option ${idx + 1}`,
                    voteCount: Number(parsed[`votes_${idx}`] || 0),
                  }));
                }
                if (metadata.minVotes != null && metadata.minVotes > 0) minVotes = metadata.minVotes;
                if (metadata.category?.trim()) category = metadata.category.trim();
              }
            } catch (ipfsError) {
              console.warn(`Could not fetch IPFS metadata for campaign ${id}:`, ipfsError);
            }
          }
        } catch (e) {
          console.warn(`Could not decode CID for campaign ${id}:`, e);
        }
      } else {
        console.log(`Campaign ${id} has no CID parts in parsed data`);
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
        minVotes,
        category,
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

        // Parse and fetch metadata from IPFS
        const campaignData = await parseOnChainCampaign(onChainData, id);

        if (!campaignData) {
          throw new Error('Failed to parse campaign data');
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

    setShowConfirmModal(false);
    setIsVoting(true);

    try {
      const campaignIdNum = campaign.onChainId || parseInt(campaign.id);
      const timestamp = Math.floor(Date.now() / 1000);

      let result;

      // Use gasless relayer if enabled
      if (useGasless) {
        console.log('Using gasless voting via relayer');
        result = await relayerService.submitVote({
          campaignId: campaignIdNum,
          optionIndex: selectedOption,
          voterAddress: address || 'anonymous',
          timestamp,
        });
      } else {
        // Require wallet for non-gasless voting
        if (!address) {
          showError('Wallet Error', 'Please connect your wallet or use gasless voting');
          setIsVoting(false);
          return;
        }

        // Format inputs for Aleo
        const inputs = aleoService.formatCastVoteInputs(campaignIdNum, selectedOption, timestamp);

        const walletName = wallet?.adapter?.name;
        console.log('Voting with wallet:', walletName);
        console.log('Vote inputs:', inputs);

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
      }

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      setHasVoted(true);
      setLastVoteProof({
        transactionId: result.transactionId,
        eventId: result.eventId,
        address: address || undefined,
      });
      success('Vote Cast!', useGasless
        ? 'Your vote has been submitted via gasless relay!'
        : 'Your anonymous vote has been recorded on the blockchain');

      // Refresh campaign data after a short delay to allow blockchain confirmation
      setTimeout(async () => {
        try {
          const id = parseInt(campaignId);
          const onChainData = await aleoService.fetchCampaign(id);
          if (onChainData) {
            const updatedCampaign = await parseOnChainCampaign(onChainData, id);
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

  const exportResults = () => {
    if (!campaign) return;
    const programId = aleoService.getProgramId();
    const network = aleoService.getNetwork();
    const explorerUrl = aleoService.getProgramExplorerUrl();
    const payload = {
      programId,
      campaignId: campaign.onChainId ?? campaign.id,
      network,
      totalVotes: campaign.totalVotes,
      votesPerOption: campaign.options.map((o, i) => ({ optionIndex: i, label: o.label, votes: o.voteCount, percentage: o.percentage })),
      exportedAt: new Date().toISOString(),
      explorerUrl,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign.id}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProofUrl = (): string => {
    if (!lastVoteProof || !campaignId) return '';
    const txId = lastVoteProof.transactionId || lastVoteProof.eventId || '';
    const payload = { c: campaignId, t: txId, a: lastVoteProof.address ?? '' };
    const token = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) : '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/proof?t=${encodeURIComponent(token)}`;
  };

  const copyProofLink = () => {
    const url = getProofUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success('Proof link copied', 'Share this link to prove you participated (vote choice is not revealed).');
    }
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

  // Handle image error - use default campaign image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/images/default-campaign.svg';
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
                <img
                  src={campaign.imageUrl || '/images/default-campaign.svg'}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-medium border ${statusConfig[status].color}`}>
                  {statusConfig[status].label}
                </div>
                {campaign.category && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium bg-white/10 text-white/90 border border-white/20">
                    {campaign.category.charAt(0).toUpperCase() + campaign.category.slice(1)}
                  </div>
                )}

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    {campaign.title}
                  </h1>
                  <div className="flex items-center gap-4 text-white/60 text-sm flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {campaign.totalVotes} votes
                    </span>
                    {campaign.minVotes != null && campaign.minVotes > 0 && (
                      <span className="flex items-center gap-1">
                        {campaign.totalVotes >= campaign.minVotes ? (
                          <span className="text-green-400">Quorum reached ({campaign.minVotes})</span>
                        ) : (
                          <span className="text-amber-400">Quorum: {campaign.minVotes - campaign.totalVotes} more needed</span>
                        )}
                      </span>
                    )}
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
                  {/* Gasless Toggle */}
                  <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm text-green-400 font-medium">Gasless Voting</span>
                    </div>
                    <button
                      onClick={() => setUseGasless(!useGasless)}
                      className={`
                        relative w-12 h-6 rounded-full transition-colors
                        ${useGasless ? 'bg-green-500' : 'bg-white/20'}
                      `}
                    >
                      <div
                        className={`
                          absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                          ${useGasless ? 'translate-x-7' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-indigo-400 font-medium mb-1">
                        {useGasless ? 'Free Voting - No Gas Required' : 'Anonymous Voting'}
                      </p>
                      <p className="text-white/60">
                        {useGasless
                          ? 'Vote for free! Transaction fees are covered by the relayer.'
                          : 'Your vote is protected by zero-knowledge proofs. No one can see how you voted.'
                        }
                      </p>
                    </div>
                  </div>

                  <GlassButton
                    fullWidth
                    size="lg"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={selectedOption === null}
                    loading={isVoting}
                    icon={<Vote className="w-5 h-5" />}
                  >
                    {selectedOption === null
                      ? 'Select an option to vote'
                      : useGasless
                        ? 'Vote for Free'
                        : 'Submit Vote'
                    }
                  </GlassButton>

                  {!useGasless && !walletConnected && (
                    <p className="text-sm text-yellow-400 mt-2 text-center">
                      Connect wallet for non-gasless voting, or enable gasless mode above
                    </p>
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

            {/* Export results */}
            <GlassCard>
              <h3 className="font-semibold text-white mb-4">Verifiable Results</h3>
              <GlassButton
                fullWidth
                variant="secondary"
                onClick={exportResults}
                icon={<Download className="w-5 h-5" />}
              >
                Export results (JSON)
              </GlassButton>
              <p className="text-xs text-white/50 mt-2">
                Download results with program ID and explorer link to verify on-chain.
              </p>
            </GlassCard>

            {/* Share proof (after voting) */}
            {hasVoted && lastVoteProof && (
              <GlassCard>
                <h3 className="font-semibold text-white mb-4">Participation Proof</h3>
                <GlassButton
                  fullWidth
                  variant="secondary"
                  onClick={copyProofLink}
                  icon={<Share2 className="w-5 h-5" />}
                >
                  {copied ? 'Copied!' : 'Share proof link'}
                </GlassButton>
                <p className="text-xs text-white/50 mt-2">
                  Share this link to prove you voted. Your choice is not revealed.
                </p>
              </GlassCard>
            )}
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
