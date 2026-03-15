'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Gavel,
  Loader2,
  Lock,
  Shield,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { useToastStore } from '@/stores/toastStore';
import { useWalletStore } from '@/stores/walletStore';
import { auctionService } from '@/services/auction';
import { parseOnChainAuction, type ParsedAuction } from '@/services/auctionParser';
import { pinataService } from '@/services/pinata';
import {
  buildBidPrivateParams,
  buildBidPublicParams,
  buildRedeemBidPublicParams,
  buildSelectWinnerParams,
  buildSelectWinnerPrivateParams,
  createTransaction,
  getAuctionProgramId,
} from '@/utils/transaction';
import { useWalletSession } from '@/hooks/useWalletSession';

type AuctionPrivacySettings = {
  auctionPrivacy: number;
  bidTypesAccepted: number;
};

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [rawAuction, setRawAuction] = useState<unknown>(null);
  const [parsed, setParsed] = useState<ParsedAuction | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicBidAmount, setPublicBidAmount] = useState('');
  const [privateBidAmount, setPrivateBidAmount] = useState('');
  const [isPublicBidding, setIsPublicBidding] = useState(false);
  const [isPrivateBidding, setIsPrivateBidding] = useState(false);
  const [bidCount, setBidCount] = useState(0);
  const [highestBid, setHighestBid] = useState(0);
  const [winningBidId, setWinningBidId] = useState<string | null>(null);
  const [winningBidOwner, setWinningBidOwner] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [auctionPublicKey, setAuctionPublicKey] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState<AuctionPrivacySettings | null>(null);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [winningBidIdInput, setWinningBidIdInput] = useState('');
  const [isEndingPublic, setIsEndingPublic] = useState(false);
  const [isEndingPrivate, setIsEndingPrivate] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const { address, requestTransaction, wallet, connected, walletName } = useWalletSession();
  const { isConnected, address: storedAddress } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const walletConnected = !!(connected || isConnected || address);
  const isCreator = !!(address && owner && address.toLowerCase() === owner.toLowerCase());

  useEffect(() => {
    let cancelled = false;

    async function loadAuction() {
      setLoading(true);
      try {
        const decodedId = decodeURIComponent(id);
        let auctionKey = decodedId;
        const numericId = /^\d+$/.test(decodedId) ? parseInt(decodedId, 10) : null;

        if (numericId != null && numericId > 0) {
          const indexedAuctionId = await auctionService.getPublicAuctionIdByIndex(numericId);
          if (indexedAuctionId) {
            auctionKey = indexedAuctionId;
          }
        }

        const raw = await auctionService.getPublicAuction(auctionKey);
        if (cancelled || raw == null) return;

        setAuctionId(auctionKey);
        setRawAuction(raw);
        const parsedAuction = await parseOnChainAuction(raw, auctionKey);
        if (!cancelled) {
          setParsed(parsedAuction);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAuction();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!auctionId) return;
    const currentAuctionId = auctionId;

    let cancelled = false;

    async function loadAuctionState() {
      const [auctionOwner, currentBidCount, currentHighestBid, currentWinningBidId, settings, publicKeyValue, redeemed] =
        await Promise.all([
          auctionService.getAuctionOwner(currentAuctionId),
          auctionService.getBidCount(currentAuctionId),
          auctionService.getHighestBid(currentAuctionId),
          auctionService.getWinningBidId(currentAuctionId),
          auctionService.getAuctionPrivacySettings(currentAuctionId),
          auctionService.getAuctionPublicKey(currentAuctionId),
          auctionService.isRedeemed(currentAuctionId),
        ]);

      if (cancelled) return;

      setOwner(auctionOwner);
      setBidCount(currentBidCount);
      setHighestBid(currentHighestBid);
      setWinningBidId(currentWinningBidId);
      setPrivacySettings(settings);
      setAuctionPublicKey(publicKeyValue);
      setIsRedeemed(redeemed);

      if (currentWinningBidId) {
        const currentWinner = await auctionService.getPublicBidOwner(currentWinningBidId);
        if (!cancelled) {
          setWinningBidOwner(currentWinner);
        }
      } else {
        setWinningBidOwner(null);
      }
    }

    loadAuctionState();

    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  const refreshAuctionState = async () => {
    if (!auctionId) return;

    const [currentBidCount, currentHighestBid, currentWinningBidId, redeemed] = await Promise.all([
      auctionService.getBidCount(auctionId),
      auctionService.getHighestBid(auctionId),
      auctionService.getWinningBidId(auctionId),
      auctionService.isRedeemed(auctionId),
    ]);

    setBidCount(currentBidCount);
    setHighestBid(currentHighestBid);
    setWinningBidId(currentWinningBidId);
    setIsRedeemed(redeemed);

    if (currentWinningBidId) {
      setWinningBidOwner(await auctionService.getPublicBidOwner(currentWinningBidId));
    } else {
      setWinningBidOwner(null);
    }
  };

  const name = parsed?.name ?? 'Untitled';
  const startingBid = parsed?.startingBid ?? 0;
  const description = parsed?.description ?? '';
  const imageUrl = parsed?.imageUrl ? pinataService.getProxiedUrl(parsed.imageUrl) : undefined;
  const minBid = highestBid > 0 ? highestBid + 1 : startingBid;
  const isEnded = !!winningBidId;
  const isWinner = !!(address && winningBidOwner && address.toLowerCase() === winningBidOwner.toLowerCase());
  const allowsPublicBids = (privacySettings?.bidTypesAccepted ?? 1) !== 0;
  const allowsPrivateBids = (privacySettings?.bidTypesAccepted ?? 1) !== 1;
  const bidMode =
    privacySettings?.bidTypesAccepted === 0
      ? 'Private only'
      : privacySettings?.bidTypesAccepted === 2
        ? 'Mixed'
        : 'Public only';

  const handlePublicBid = async () => {
    if (!auctionId || !address || !walletName) {
      showError('Wallet required', 'Connect a wallet to place a public bid.');
      return;
    }
    if (isCreator) {
      showError('Creator cannot bid', 'The auction creator cannot bid on their own auction.');
      return;
    }
    if (isEnded) {
      showError('Auction ended', 'This auction has already ended.');
      return;
    }

    const amount = Math.floor(Number(publicBidAmount));
    if (!Number.isFinite(amount) || amount < minBid) {
      showError('Invalid amount', `Enter a public bid of at least ${minBid} credits.`);
      return;
    }

    setIsPublicBidding(true);
    try {
      const nonce = Math.floor(Math.random() * 1e12) + 1;
      const params = buildBidPublicParams([`${amount}u64`, auctionId, `${nonce}scalar`, 'true']);
      const result = await createTransaction(params, requestTransaction, address, walletName, getAuctionProgramId());

      if (!result.success) {
        throw new Error(result.error || 'Public bid failed');
      }

      success('Public bid placed', 'Your wallet should now hold a BidReceipt record for this bid.');
      setPublicBidAmount('');
      await refreshAuctionState();
    } catch (error) {
      showError('Public bid failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsPublicBidding(false);
    }
  };

  const handlePrivateBid = async () => {
    if (!auctionId || !address || !walletName || !owner || !auctionPublicKey) {
      showError('Auction unavailable', 'The owner address or auction public key is missing.');
      return;
    }
    if (isCreator) {
      showError('Creator cannot bid', 'The auction creator cannot bid on their own auction.');
      return;
    }
    if (isEnded) {
      showError('Auction ended', 'This auction has already ended.');
      return;
    }

    const amount = Math.floor(Number(privateBidAmount));
    if (!Number.isFinite(amount) || amount < minBid) {
      showError('Invalid amount', `Enter a private bid of at least ${minBid} credits.`);
      return;
    }

    setIsPrivateBidding(true);
    try {
      const nonce = Math.floor(Math.random() * 1e12) + 1;
      const params = buildBidPrivateParams([
        `${amount}u64`,
        auctionId,
        owner,
        auctionPublicKey,
        `${nonce}scalar`,
      ]);
      const result = await createTransaction(params, requestTransaction, address, walletName, getAuctionProgramId());

      if (!result.success) {
        throw new Error(result.error || 'Private bid failed');
      }

      success(
        'Private bid placed',
        'Your wallet should now hold a BidReceipt record. Shield Wallet is the smoothest option for record-based flows.'
      );
      setPrivateBidAmount('');
      await refreshAuctionState();
    } catch (error) {
      showError('Private bid failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsPrivateBidding(false);
    }
  };

  const handleSelectPublicWinner = async () => {
    if (!auctionId || !address || !walletName) {
      showError('Wallet required', 'Connect the creator wallet to select the winner.');
      return;
    }

    const bidId = winningBidIdInput.trim();
    if (!bidId) {
      showError('Missing bid ID', 'Enter the winning public bid ID from the bidder’s BidReceipt.');
      return;
    }

    const publicBid = await auctionService.getPublicBid(bidId);
    if (!publicBid || publicBid.auction_id !== auctionId || !publicBid.bid_public_key) {
      showError('Invalid bid', 'That public bid could not be verified for this auction.');
      return;
    }
    if (publicBid.amount !== highestBid) {
      showError('Wrong bid', 'Only the highest public bid can be selected.');
      return;
    }

    setIsEndingPublic(true);
    try {
      const winningBidStruct = `{ amount: ${publicBid.amount}u64, auction_id: ${auctionId}, bid_public_key: ${publicBid.bid_public_key} }`;
      const params = buildSelectWinnerParams([winningBidStruct, bidId.endsWith('field') ? bidId : `${bidId}field`]);
      const result = await createTransaction(params, requestTransaction, address, walletName, getAuctionProgramId());

      if (!result.success) {
        throw new Error(result.error || 'Winner selection failed');
      }

      success('Public winner selected', 'Your wallet should prompt for the AuctionTicket record.');
      await refreshAuctionState();
    } catch (error) {
      showError('Winner selection failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsEndingPublic(false);
    }
  };

  const handleSelectPrivateWinner = async () => {
    if (!auctionId || !address || !walletName) {
      showError('Wallet required', 'Connect the creator wallet to select the private winner.');
      return;
    }

    setIsEndingPrivate(true);
    try {
      const params = buildSelectWinnerPrivateParams();
      const result = await createTransaction(params, requestTransaction, address, walletName, getAuctionProgramId());

      if (!result.success) {
        throw new Error(result.error || 'Private winner selection failed');
      }

      success(
        'Private winner selected',
        'Use the creator wallet that holds the AuctionTicket and PrivateBid records. Shield Wallet is strongly recommended here.'
      );
      await refreshAuctionState();
    } catch (error) {
      showError('Private winner selection failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsEndingPrivate(false);
    }
  };

  const handleRedeemWinningBid = async () => {
    if (!walletName || !address || !owner) {
      showError('Wallet required', 'Connect the winning wallet to redeem this bid.');
      return;
    }

    setIsRedeeming(true);
    try {
      const params = buildRedeemBidPublicParams([owner]);
      const result = await createTransaction(params, requestTransaction, address, walletName, getAuctionProgramId());

      if (!result.success) {
        throw new Error(result.error || 'Redeem failed');
      }

      success('Redeem submitted', 'Your wallet should prompt you to choose the winning BidReceipt record.');
      await refreshAuctionState();
    } catch (error) {
      showError('Redeem failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!auctionId || rawAuction == null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <GlassCard className="max-w-md p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <h2 className="mb-2 text-xl font-semibold text-white">Auction not found</h2>
          <p className="mb-6 text-white/60">The auction may not exist or the ID is invalid.</p>
          <Link href="/auctions">
            <GlassButton variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Auctions
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/auctions" className="mb-8 inline-flex items-center gap-2 text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <GlassCard className="mb-8 overflow-hidden p-0">
            {imageUrl ? (
              <div className="relative h-56 w-full bg-white/[0.06]">
                <a href={parsed?.imageUrl || imageUrl} target="_blank" rel="noreferrer">
                  <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                </a>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            ) : null}

            <div className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Gavel className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{name}</h1>
                  <p className="max-w-xs truncate font-mono text-sm text-white/50">ID: {auctionId.slice(0, 20)}...</p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-white">About this Auction</h2>
                <p className="leading-relaxed text-white/70">{description}</p>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-white/50">Starting bid</dt>
                  <dd className="text-lg text-emerald-400">{startingBid} credits</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/50">Minimum bid</dt>
                  <dd className="text-lg text-emerald-400">{minBid} credits</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/50">Bid mode</dt>
                  <dd className="text-lg text-white/80">{bidMode}</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/50">Settlement</dt>
                  <dd className="text-lg text-white/80">{isRedeemed ? 'Redeemed' : isEnded ? 'Winner selected' : 'Open'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-sm text-white/50">
                    <Users className="h-4 w-4" /> Bids
                  </dt>
                  <dd className="text-lg text-white/80">{bidCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-sm text-white/50">
                    <Trophy className="h-4 w-4" /> Highest bid
                  </dt>
                  <dd className="text-lg text-emerald-400">{highestBid || 0} credits</dd>
                </div>
              </dl>
            </div>
          </GlassCard>

          {isCreator && (
            <GlassCard className="mb-8 p-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="h-5 w-5" /> Creator controls
              </h2>
              <p className="mb-4 text-sm text-white/60">
                Use the creator wallet that holds the AuctionTicket record. Shield Wallet is best for the private-record flows.
              </p>

              {!isEnded && bidCount > 0 && allowsPublicBids && (
                <div className="mb-6">
                  <p className="mb-3 text-xs text-white/40">
                    Paste the winning public bid ID from the bidder’s BidReceipt to select the winner.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <GlassInput
                      placeholder="Winning public bid ID"
                      value={winningBidIdInput}
                      onChange={(event) => setWinningBidIdInput(event.target.value)}
                      className="flex-1"
                    />
                    <GlassButton
                      onClick={handleSelectPublicWinner}
                      disabled={isEndingPublic}
                      loading={isEndingPublic}
                      icon={<Trophy className="h-4 w-4" />}
                    >
                      {isEndingPublic ? 'Selecting…' : 'Select Public Winner'}
                    </GlassButton>
                  </div>
                </div>
              )}

              {!isEnded && bidCount > 0 && allowsPrivateBids && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Select private winner</p>
                        <p className="mt-1 text-xs text-white/55">
                          This flow expects the creator wallet to hold both the AuctionTicket and a PrivateBid record.
                        </p>
                      </div>
                    </div>
                    <GlassButton
                      onClick={handleSelectPrivateWinner}
                      disabled={isEndingPrivate}
                      loading={isEndingPrivate}
                      icon={<Lock className="h-4 w-4" />}
                    >
                      {isEndingPrivate ? 'Selecting…' : 'Select Private Winner'}
                    </GlassButton>
                  </div>
                </div>
              )}

              {isEnded && (
                <p className="text-sm text-emerald-400">
                  {isRedeemed ? 'Auction settled successfully.' : 'A winner has been selected and is waiting to redeem.'}
                </p>
              )}
            </GlassCard>
          )}

          {!walletConnected && !isEnded && (
            <GlassCard className="mb-8 flex items-start gap-3 p-8 text-white/70">
              <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm">
                Connect a wallet to bid. Shield Wallet is the recommended choice when you want private bidding and record selection to work smoothly.
              </p>
            </GlassCard>
          )}

          {walletConnected && !isCreator && !isEnded && (
            <div className="mb-8 space-y-6">
              {allowsPublicBids && (
                <GlassCard className="p-8">
                  <h2 className="mb-4 text-lg font-semibold text-white">Place a public bid</h2>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <GlassInput
                      type="number"
                      min={minBid}
                      placeholder="Amount (credits)"
                      value={publicBidAmount}
                      onChange={(event) => setPublicBidAmount(event.target.value)}
                    />
                    <GlassButton
                      onClick={handlePublicBid}
                      disabled={isPublicBidding}
                      icon={isPublicBidding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                    >
                      {isPublicBidding ? 'Placing…' : 'Place Public Bid'}
                    </GlassButton>
                  </div>
                  <p className="mt-3 text-sm text-white/50">
                    Minimum bid: {minBid} credits. This creates a BidReceipt record in your wallet.
                  </p>
                </GlassCard>
              )}

              {allowsPrivateBids && (
                <GlassCard className="p-8">
                  <h2 className="mb-4 text-lg font-semibold text-white">Place a private bid</h2>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <GlassInput
                      type="number"
                      min={minBid}
                      placeholder="Amount (credits)"
                      value={privateBidAmount}
                      onChange={(event) => setPrivateBidAmount(event.target.value)}
                    />
                    <GlassButton
                      onClick={handlePrivateBid}
                      disabled={isPrivateBidding}
                      icon={isPrivateBidding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    >
                      {isPrivateBidding ? 'Placing…' : 'Place Private Bid'}
                    </GlassButton>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-300">Shield-friendly private flow</p>
                        <p className="mt-1 text-sm text-white/60">
                          Private bids are record-based. Keep the BidReceipt safe because the winner needs it later for redemption.
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {walletConnected && isCreator && !isEnded && (
            <GlassCard className="mb-8 flex items-center gap-3 p-8 text-amber-400/90">
              <Ban className="h-5 w-5 shrink-0" />
              <p className="text-sm">You cannot bid on your own auction.</p>
            </GlassCard>
          )}

          {isEnded && !isCreator && (
            <GlassCard className="mb-8 p-8 text-sm text-white/60">
              <p>Only the winner pays when redeeming. Non-winning bidders do not lock funds.</p>

              {isWinner && !isRedeemed && (
                <div className="mt-4">
                  <GlassButton
                    onClick={handleRedeemWinningBid}
                    disabled={isRedeeming}
                    loading={isRedeeming}
                    icon={<CheckCircle className="h-4 w-4" />}
                  >
                    {isRedeeming ? 'Redeeming…' : 'Redeem Winning Bid'}
                  </GlassButton>
                </div>
              )}

              {isWinner && isRedeemed && (
                <p className="mt-4 text-emerald-400">Your winning bid has already been redeemed.</p>
              )}

              {!isWinner && winningBidOwner && (
                <p className="mt-4 text-white/45">
                  Winner: {winningBidOwner.slice(0, 12)}...{winningBidOwner.slice(-6)}
                </p>
              )}
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}
