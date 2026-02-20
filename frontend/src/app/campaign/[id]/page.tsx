'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { parseOnChainCampaign } from '@/services/campaignParser';
import { createTransaction, requestCreateEvent, getProgramId, buildVoteParams } from '@/utils/transaction';
import { Campaign, VotingOption } from '@/types';
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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { publicKey, requestTransaction, wallet, connected } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();

  // Use wallet adapter connection state
  const walletConnected = connected || isConnected;
  const address = publicKey;

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

        const inputs = aleoService.formatCastVoteInputs(campaignIdNum, selectedOption, timestamp);
        const walletName = wallet?.adapter?.name;
        const params = buildVoteParams(inputs, address, walletName);
        const execute = walletName === 'Puzzle Wallet' ? requestCreateEvent : requestTransaction;
        result = await createTransaction(params, execute, walletName);
      }

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      setHasVoted(true);
      setLastVoteProof({
        transactionId: result.transactionId,
        eventId: 'eventId' in result ? (result as { eventId?: string }).eventId : undefined,
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

  const generateReport = async () => {
    if (!campaign) return;
    setIsGeneratingReport(true);
    try {
      const programId = aleoService.getProgramId();
      const explorerUrl = aleoService.getProgramExplorerUrl();
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.onChainId ?? campaign.id,
          title: campaign.title,
          totalVotes: campaign.totalVotes,
          options: campaign.options.map((o) => ({
            label: o.label,
            votes: o.voteCount,
            percentage: o.percentage,
          })),
          startTime: campaign.startTime.toISOString(),
          endTime: campaign.endTime.toISOString(),
          creator: campaign.creator,
          programId,
          explorerUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate report');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privote-campaign-${campaign.id}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      success('Report downloaded', 'Your campaign report PDF is ready.');
    } catch (e) {
      showError('Report failed', e instanceof Error ? e.message : 'Could not generate report');
    } finally {
      setIsGeneratingReport(false);
    }
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
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
              <div className="relative h-64 sm:h-80 bg-white/[0.06]">
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
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
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

                  <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-emerald-400 font-medium mb-1">
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
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
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

            {/* Generate report */}
            <GlassCard>
              <h3 className="font-semibold text-white mb-4">Campaign Report</h3>
              <GlassButton
                fullWidth
                variant="secondary"
                onClick={generateReport}
                loading={isGeneratingReport}
                disabled={isGeneratingReport || (campaign?.totalVotes ?? 0) === 0}
                icon={<Download className="w-5 h-5" />}
              >
                {isGeneratingReport ? 'Generating…' : 'Generate report (PDF)'}
              </GlassButton>
              <p className="text-xs text-white/50 mt-2">
                PDF with results, chart, and AI summary. Includes program ID and explorer link.
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
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-xl border transition-colors
        ${disabled && !showResults ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected
          ? 'bg-white/10 border-emerald-500'
          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/5'
        }
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center
            ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/30'}
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
            <div
              className="h-full bg-emerald-600 rounded-full transition-[width] duration-500"
              style={{ width: `${option.percentage || 0}%` }}
            />
          </div>
          <p className="text-sm text-white/50 mt-2">{option.voteCount} votes</p>
        </div>
      )}
    </button>
  );
}
