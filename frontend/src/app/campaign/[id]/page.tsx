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
  const [isCheckingVote, setIsCheckingVote] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setIsCheckingVote(true);
      setError(null);

      try {
        const id = parseInt(campaignId);
        if (isNaN(id)) {
          throw new Error('Invalid campaign ID');
        }

        // Check vote status FIRST if wallet is connected (before loading campaign)
        const checkVoteStatus = async () => {
          if (address && walletConnected) {
            try {
              const addressHash = aleoService.hashToField(address);
              const voted = await aleoService.hasVoted(id, addressHash);
              
              if (voted) {
                setHasVoted(true);
                const voteKey = `vote_${id}_${address}`;
                localStorage.setItem(voteKey, JSON.stringify({
                  voted: true,
                  timestamp: Date.now(),
                  confirmed: true,
                }));
              } else {
                const voteKey = `vote_${id}_${address}`;
                const storedVote = localStorage.getItem(voteKey);
                if (storedVote) {
                  try {
                    const voteData = JSON.parse(storedVote);
                    if (voteData.voted) {
                      setHasVoted(true);
                    } else {
                      localStorage.removeItem(voteKey);
                      setHasVoted(false);
                    }
                  } catch (e) {
                    localStorage.removeItem(voteKey);
                    setHasVoted(false);
                  }
                } else {
                  setHasVoted(false);
                }
              }
            } catch (voteCheckErr) {
              if (address) {
                const voteKey = `vote_${id}_${address}`;
                const storedVote = localStorage.getItem(voteKey);
                if (storedVote) {
                  try {
                    const voteData = JSON.parse(storedVote);
                    setHasVoted(voteData.voted || false);
                  } catch (e) {
                    setHasVoted(false);
                  }
                } else {
                  setHasVoted(false);
                }
              }
            }
          } else {
            setHasVoted(false);
          }
          setIsCheckingVote(false);
        };

        // Load campaign data and check vote status in parallel
        // Only check vote if wallet is connected, otherwise skip check
        if (address && walletConnected) {
          const [onChainData] = await Promise.all([
            aleoService.fetchCampaign(id),
            checkVoteStatus()
          ]);
          
          if (!onChainData) {
            throw new Error('Campaign not found');
          }

          const campaignData = await parseOnChainCampaign(onChainData, id);

          if (!campaignData) {
            throw new Error('Failed to parse campaign data');
          }

          if (campaignData.totalVotes > 0) {
            campaignData.options = campaignData.options.map(opt => ({
              ...opt,
              percentage: Math.round((opt.voteCount / campaignData.totalVotes) * 100),
            }));
          }

          setCampaign(campaignData);
        } else {
          // No wallet connected - just load campaign, vote check will happen when wallet connects
          const onChainData = await aleoService.fetchCampaign(id);
          
          if (!onChainData) {
            throw new Error('Campaign not found');
          }

          const campaignData = await parseOnChainCampaign(onChainData, id);

          if (!campaignData) {
            throw new Error('Failed to parse campaign data');
          }

          if (campaignData.totalVotes > 0) {
            campaignData.options = campaignData.options.map(opt => ({
              ...opt,
              percentage: Math.round((opt.voteCount / campaignData.totalVotes) * 100),
            }));
          }

          setCampaign(campaignData);
          setIsCheckingVote(false);
          setHasVoted(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load campaign');
        setIsCheckingVote(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, address, walletConnected]);

  // Separate effect to check vote status immediately when wallet connects
  useEffect(() => {
    if (!campaign || !address || !walletConnected) {
      // If no wallet connected, ensure we're not checking
      if (!address || !walletConnected) {
        setIsCheckingVote(false);
      }
      return;
    }

    const checkVoteOnWalletConnect = async () => {
      setIsCheckingVote(true);
      try {
        const id = parseInt(campaignId);
        if (isNaN(id)) {
          setIsCheckingVote(false);
          return;
        }

        const addressHash = aleoService.hashToField(address);
        const voted = await aleoService.hasVoted(id, addressHash);
        
        if (voted) {
          setHasVoted(true);
          const voteKey = `vote_${id}_${address}`;
          localStorage.setItem(voteKey, JSON.stringify({
            voted: true,
            timestamp: Date.now(),
            confirmed: true,
          }));
        } else {
          const voteKey = `vote_${id}_${address}`;
          const storedVote = localStorage.getItem(voteKey);
          if (storedVote) {
            try {
              const voteData = JSON.parse(storedVote);
              if (voteData.voted) {
                setHasVoted(true);
              } else {
                localStorage.removeItem(voteKey);
                setHasVoted(false);
              }
            } catch (e) {
              localStorage.removeItem(voteKey);
              setHasVoted(false);
            }
          } else {
            setHasVoted(false);
          }
        }
      } catch (err) {
        // On error, check localStorage as fallback
        if (address) {
          const id = parseInt(campaignId);
          if (!isNaN(id)) {
            const voteKey = `vote_${id}_${address}`;
            const storedVote = localStorage.getItem(voteKey);
            if (storedVote) {
              try {
                const voteData = JSON.parse(storedVote);
                setHasVoted(voteData.voted || false);
              } catch (e) {
                setHasVoted(false);
              }
            } else {
              setHasVoted(false);
            }
          }
        }
      } finally {
        setIsCheckingVote(false);
      }
    };

    checkVoteOnWalletConnect();
  }, [campaign, campaignId, address, walletConnected]);

  // Periodic check for vote status (only if not already voted and not currently checking)
  useEffect(() => {
    if (!campaign || !address || !walletConnected || hasVoted || isCheckingVote) return;

    const checkVoteStatus = async () => {
      try {
        const id = parseInt(campaignId);
        if (isNaN(id)) return;

        const addressHash = aleoService.hashToField(address);
        const voted = await aleoService.hasVoted(id, addressHash);
        
        if (voted && !hasVoted) {
          setHasVoted(true);
          
          const voteKey = `vote_${id}_${address}`;
          localStorage.setItem(voteKey, JSON.stringify({
            voted: true,
            timestamp: Date.now(),
            confirmed: true,
          }));
          
          const onChainData = await aleoService.fetchCampaign(id);
          if (onChainData && campaign) {
            const updatedCampaign = await parseOnChainCampaign(onChainData, id);
            if (updatedCampaign) {
              updatedCampaign.title = campaign.title;
              updatedCampaign.description = campaign.description;
              updatedCampaign.imageUrl = campaign.imageUrl;
              if (updatedCampaign.totalVotes > 0) {
                updatedCampaign.options = updatedCampaign.options.map(opt => ({
                  ...opt,
                  percentage: Math.round((opt.voteCount / updatedCampaign.totalVotes) * 100),
                }));
              }
              setCampaign(updatedCampaign);
            }
          }
        }
      } catch (err) {
        // Silent fail for periodic check
      }
    };

    checkVoteStatus();
    const interval = setInterval(checkVoteStatus, 10000);

    return () => clearInterval(interval);
  }, [campaign, campaignId, address, walletConnected, hasVoted, isCheckingVote]);

  const getCampaignStatus = () => {
    if (!campaign) return 'loading';
    const now = new Date();
    const startTime = campaign.startTime;
    const endTime = campaign.endTime;
    
    if (isPast(endTime)) return 'ended';
    if (isFuture(startTime)) return 'upcoming';
    return 'active';
  };

  const status = getCampaignStatus();
  

  const handleVote = async () => {
    if (selectedOption === null || !campaign) return;

    // Prevent double voting - check both state and localStorage
    if (hasVoted) {
      showError('Already Voted', 'You have already voted on this campaign.');
      return;
    }
    
    // Also check localStorage as backup
    if (address) {
      const voteKey = `vote_${campaign.onChainId || campaign.id}_${address}`;
      const storedVote = localStorage.getItem(voteKey);
      if (storedVote) {
        try {
          const voteData = JSON.parse(storedVote);
          if (voteData.voted) {
            showError('Already Voted', 'You have already voted on this campaign. Please refresh the page to see updated status.');
            setHasVoted(true);
            return;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    setShowConfirmModal(false);
    setIsVoting(true);
    setError(null);

    try {
      // Get campaign ID - prefer onChainId, fallback to parsing id or URL param
      let campaignIdNum: number;
      if (campaign.onChainId != null && campaign.onChainId > 0) {
        campaignIdNum = campaign.onChainId;
      } else {
        const parsedId = parseInt(campaign.id);
        if (!isNaN(parsedId) && parsedId > 0) {
          campaignIdNum = parsedId;
        } else {
          const urlId = parseInt(campaignId);
          if (!isNaN(urlId) && urlId > 0) {
            campaignIdNum = urlId;
          } else {
            throw new Error('Invalid campaign ID');
          }
        }
      }


      // Validate campaign ID
      if (!Number.isFinite(campaignIdNum) || campaignIdNum <= 0) {
        throw new Error(`Invalid campaign ID: ${campaignIdNum}. Campaign ID: ${campaign.id}, OnChain ID: ${campaign.onChainId}`);
      }

      // Validate option index
      if (selectedOption < 0 || selectedOption >= campaign.options.length) {
        throw new Error(`Invalid option index: ${selectedOption}. Available options: ${campaign.options.length}`);
      }

      // Validate campaign is active before sending transaction
      const now = Math.floor(Date.now() / 1000);
      const startTime = Math.floor(campaign.startTime.getTime() / 1000);
      const endTime = Math.floor(campaign.endTime.getTime() / 1000);
      
      if (now < startTime) {
        throw new Error('Campaign has not started yet. Voting will begin when the campaign starts.');
      }
      
      if (now >= endTime) {
        throw new Error('Campaign has ended. Voting is no longer allowed.');
      }
      
      if (!campaign.isActive) {
        throw new Error('Campaign is not active. Voting is disabled.');
      }

      const timestamp = Math.floor(Date.now() / 1000);

      // Require wallet connection
      if (!address) {
        showError('Wallet Required', 'Please connect your wallet to vote');
        setIsVoting(false);
        return;
      }

      if (!wallet?.adapter?.name) {
        showError('Wallet Error', 'Wallet adapter not found. Please reconnect your wallet.');
        setIsVoting(false);
        return;
      }

      // Pre-flight check: Verify user hasn't already voted before sending transaction
      try {
        const addressHash = aleoService.hashToField(address);
            const alreadyVoted = await aleoService.hasVoted(campaignIdNum, addressHash);
            if (alreadyVoted) {
              showError('Already Voted', 'You have already voted on this campaign. Each address can only vote once.');
              setHasVoted(true);
              setIsVoting(false);
              return;
            }
          } catch (voteCheckError) {
            // Don't block transaction if check fails
          }

      const inputs = aleoService.formatCastVoteInputs(campaignIdNum, selectedOption, timestamp);
      const walletName = wallet.adapter.name;
      const params = buildVoteParams(inputs, address, walletName);
      const execute = walletName === 'Puzzle Wallet' ? requestCreateEvent : requestTransaction;
      
      // Store previous vote count for verification
      const previousTotalVotes = campaign.totalVotes;
      
      const result = await createTransaction(params, execute, walletName);

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      // Verify vote was registered by polling for vote count increase
      // Reuse addressHash from pre-flight check or calculate it
      const addressHash = aleoService.hashToField(address);
      
      // Start polling for vote status in the background
      // This ensures hasVoted is updated once the transaction is finalized
      const pollForVoteStatus = async () => {
        let attempts = 0;
        const maxAttempts = 30; // Poll for up to 60 seconds (2s * 30)
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          attempts++;
          
          try {
            const voted = await aleoService.hasVoted(campaignIdNum, addressHash);
            if (voted) {
              setHasVoted(true);
              // Update localStorage to mark as confirmed
              if (address) {
                const voteKey = `vote_${campaignIdNum}_${address}`;
                localStorage.setItem(voteKey, JSON.stringify({
                  voted: true,
                  timestamp: Date.now(),
                  confirmed: true,
                }));
              }
              // Refresh campaign data
              try {
                const id = parseInt(campaignId);
                const onChainData = await aleoService.fetchCampaign(id);
                if (onChainData) {
                  const updatedCampaign = await parseOnChainCampaign(onChainData, id);
                  if (updatedCampaign && campaign) {
                    updatedCampaign.title = campaign.title;
                    updatedCampaign.description = campaign.description;
                    updatedCampaign.imageUrl = campaign.imageUrl;
                    if (updatedCampaign.totalVotes > 0) {
                      updatedCampaign.options = updatedCampaign.options.map(opt => ({
                        ...opt,
                        percentage: Math.round((opt.voteCount / updatedCampaign.totalVotes) * 100),
                      }));
                    }
                    setCampaign(updatedCampaign);
                  }
                }
              } catch (e) {
                // Silent fail
              }
              return; // Stop polling once confirmed
            }
          } catch (e) {
            // Silent fail for polling
          }
        }
      };
      
      // Start polling in background (don't await)
      pollForVoteStatus();
      
      const verification = await aleoService.verifyVoteRegistration(
        campaignIdNum,
        addressHash,
        previousTotalVotes
      );

      if (!verification.verified) {
        // Transaction was submitted but not yet finalized - this is normal for async transactions
        // Show success message but note that verification is pending
        if (verification.error?.includes('timeout') || verification.error?.includes('did not increase')) {
          success(
            'Vote Submitted', 
            'Your vote transaction has been submitted and is being processed. The vote count will update once the transaction is finalized (usually within 30-60 seconds). Please refresh the page in a moment to see updated counts.'
          );
        } else if (verification.error?.includes('not found in has_voted')) {
          // Transaction submitted but not yet finalized - this is expected
          success(
            'Vote Submitted', 
            'Your vote transaction has been submitted and is being processed on the blockchain. The vote will be registered once the transaction is finalized. Please wait 30-60 seconds and refresh the page to see updated counts.'
          );
        } else {
          // For other errors, show warning but don't fail completely
          success(
            'Vote Submitted', 
            'Your vote transaction has been submitted. Please refresh the page in a moment to see updated counts.'
          );
        }
      } else {
        success('Vote Cast!', `Your anonymous vote has been recorded and verified. Total votes: ${verification.newTotalVotes}`);
      }

      // Update UI state immediately to prevent double voting
      // Even if verification is pending, we mark as voted to prevent UI from allowing another vote
      setHasVoted(true);
      
      // Store vote status in localStorage as backup (keyed by campaign ID and address)
      if (address) {
        const voteKey = `vote_${campaignIdNum}_${address}`;
        localStorage.setItem(voteKey, JSON.stringify({
          voted: true,
          timestamp: Date.now(),
          transactionId: result.transactionId,
        }));
      }
      
      setLastVoteProof({
        transactionId: result.transactionId,
        eventId: 'eventId' in result ? (result as { eventId?: string }).eventId : undefined,
        address: address || undefined,
      });

      // Refresh campaign data with verified vote count
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
            
            // Recalculate percentages with updated vote counts
            if (updatedCampaign.totalVotes > 0) {
              updatedCampaign.options = updatedCampaign.options.map(opt => ({
                ...opt,
                percentage: Math.round((opt.voteCount / updatedCampaign.totalVotes) * 100),
              }));
            }
            
            setCampaign(updatedCampaign);
          }
        }
      } catch (refreshErr) {
        // Silent fail for refresh
        // If refresh fails but verification succeeded, still update local state
        if (verification.verified && campaign) {
          const updatedCampaign = { ...campaign };
          updatedCampaign.totalVotes = verification.newTotalVotes;
          // Update the selected option's vote count
          updatedCampaign.options = campaign.options.map((opt, idx) => {
            if (idx === selectedOption) {
              return {
                ...opt,
                voteCount: opt.voteCount + 1,
                percentage: Math.round(((opt.voteCount + 1) / verification.newTotalVotes) * 100),
              };
            }
            return {
              ...opt,
              percentage: Math.round((opt.voteCount / verification.newTotalVotes) * 100),
            };
          });
          setCampaign(updatedCampaign);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Transaction failed';
      
      // Provide more specific error messages
      if (errorMessage.includes('rejected')) {
        showError(
          'Transaction Rejected', 
          'Your vote transaction was rejected by the network. Common reasons: insufficient balance, campaign validation failed, or you already voted. Please check your balance and try again.'
        );
      } else if (errorMessage.includes('cancelled')) {
        showError('Vote Cancelled', 'The vote transaction was cancelled. Please try again if you want to vote.');
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        showError('Insufficient Balance', 'You do not have enough credits to pay for the transaction fee (300,000 microcredits). Please add credits to your wallet.');
      } else if (errorMessage.includes('already voted') || errorMessage.includes('has_voted') || errorMessage.includes('assert')) {
        showError('Already Voted', 'You have already voted on this campaign. Each address can only vote once.');
        setHasVoted(true);
      } else if (errorMessage.includes('not active') || errorMessage.includes('is_active') || errorMessage.includes('ended') || errorMessage.includes('not started')) {
        showError('Campaign Status Error', errorMessage);
      } else if (errorMessage.includes('validation failed') || errorMessage.includes('assertion')) {
        showError('Validation Failed', 'The transaction failed validation. This could mean the campaign is inactive, you already voted, or the option index is invalid.');
      } else {
        showError('Vote Failed', errorMessage);
      }
      
      setError(errorMessage);
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
                {campaign.imageUrl ? (
                  <a href={campaign.imageUrl} target="_blank" rel="noreferrer">
                    <img
                      src={pinataService.getProxiedUrl(campaign.imageUrl)}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Vote className="w-16 h-16 text-white/20" />
                  </div>
                )}
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

              {isCheckingVote ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/60">Checking vote status...</p>
                </div>
              ) : hasVoted ? (
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
              {status === 'active' && !hasVoted && !isCheckingVote && (
                <div className="mt-6 pt-6 border-t border-white/10">

                  <div className="flex items-start gap-3 mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-emerald-400 font-medium mb-1">
                        Anonymous Voting
                      </p>
                      <p className="text-white/60">
                        Your vote is protected by zero-knowledge proofs. No one can see how you voted.
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
                    {selectedOption === null ? 'Select an option to vote' : 'Submit Vote'}
                  </GlassButton>

                  {!walletConnected && (
                    <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <p className="text-sm text-yellow-400">
                          Please connect your wallet to vote. You'll need Aleo credits to pay transaction fees.
                        </p>
                      </div>
                    </div>
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
                disabled={isGeneratingReport || status !== 'ended' || (campaign?.totalVotes ?? 0) === 0}
                icon={<Download className="w-5 h-5" />}
              >
                {isGeneratingReport ? 'Generating…' : 'Generate report (PDF)'}
              </GlassButton>
              <p className="text-xs text-white/50 mt-2">
                {status !== 'ended' 
                  ? 'Report available after campaign ends.'
                  : 'PDF with results, chart, and AI summary. Includes program ID and explorer link.'}
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
