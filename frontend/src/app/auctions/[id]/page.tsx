'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Gavel, ArrowLeft, Loader2, AlertCircle, Users, Trophy, Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { auctionService } from '@/services/auction';
import { parseOnChainAuction, type ParsedAuction } from '@/services/auctionParser';
import {
  createTransaction,
  requestCreateEvent,
  buildBidPublicParams,
  buildSelectWinnerParams,
  getAuctionProgramId,
} from '@/utils/transaction';

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [parsed, setParsed] = useState<ParsedAuction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [bidCount, setBidCount] = useState(0);
  const [highestBid, setHighestBid] = useState(0);
  const [winningBidId, setWinningBidId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [bids, setBids] = useState<{ bidId: string; amount: number }[]>([]);
  const [winningBidIdInput, setWinningBidIdInput] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  const { publicKey, requestTransaction, wallet } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const address = publicKey ?? '';
  const walletName = wallet?.adapter?.name;
  const isCreator = address && owner && address.toLowerCase() === owner.toLowerCase();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const decodedId = decodeURIComponent(id);
        let key = decodedId;
        const numericId = /^\d+$/.test(decodedId) ? parseInt(decodedId, 10) : null;
        if (numericId != null && numericId > 0) {
          const byIndex = await auctionService.getPublicAuctionIdByIndex(numericId);
          if (byIndex) key = byIndex;
        }
        const raw = await auctionService.getPublicAuction(key);
        if (!cancelled && raw != null) {
          setAuctionId(key);
          setData(raw);
          const result = await parseOnChainAuction(raw, key);
          if (!cancelled && result) setParsed(result);
        }
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!auctionId) return;
    let cancelled = false;
    (async () => {
      const [o, bc, hb, wb] = await Promise.all([
        auctionService.getAuctionOwner(auctionId),
        auctionService.getBidCount(auctionId),
        auctionService.getHighestBid(auctionId),
        auctionService.getWinningBidId(auctionId),
      ]);
      if (cancelled) return;
      setOwner(o);
      setBidCount(bc);
      setHighestBid(hb);
      setWinningBidId(wb);
    })();
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  useEffect(() => {
    if (!auctionId || !isCreator) return;
    fetch(`/api/auctions/${encodeURIComponent(auctionId)}/bids`)
      .then((r) => r.json())
      .then((j) => setBids(j.bids || []))
      .catch(() => setBids([]));
  }, [auctionId, isCreator]);

  const name = parsed?.name ?? 'Untitled';
  const startingBid = parsed?.startingBid ?? 0;
  const description = parsed?.description;
  const imageUrl = parsed?.imageUrl;
  const minBid = highestBid > 0 ? highestBid + 1 : startingBid;
  const isEnded = !!winningBidId;

  const handleBid = async () => {
    if (!auctionId || !address || !walletName) {
      showError('Wallet required', 'Connect a wallet to place a bid.');
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
    const amount = Math.floor(Number(bidAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('Invalid amount', 'Enter a valid bid amount.');
      return;
    }
    if (amount < minBid) {
      showError('Below minimum', `Bid must be at least ${minBid} credits.`);
      return;
    }
    setIsBidding(true);
    try {
      const nonce = Math.floor(Math.random() * 1e12) + 1;
      const inputs = [`${amount}u64`, auctionId, `${nonce}scalar`, 'true'];
      const params = buildBidPublicParams(inputs, address, walletName);
      const execute = walletName === 'Puzzle Wallet' ? requestCreateEvent : requestTransaction;
      const result = await createTransaction(params, execute, walletName, getAuctionProgramId());
      if (result.success) {
        success('Bid placed', result.transactionId ? `Tx: ${result.transactionId.slice(0, 8)}...` : 'Check your wallet.');
        setBidAmount('');
        const [bc, hb] = await Promise.all([
          auctionService.getBidCount(auctionId),
          auctionService.getHighestBid(auctionId),
        ]);
        setBidCount(bc);
        setHighestBid(hb);
      } else {
        showError('Bid failed', result.error ?? 'Unknown error');
      }
    } catch (e: unknown) {
      showError('Bid failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsBidding(false);
    }
  };

  const handleEndAuction = async () => {
    const bidId = winningBidIdInput.trim();
    if (!bidId || !auctionId || !address || !walletName) {
      showError('Invalid input', 'Enter the winning bid ID (ask the highest bidder for their bid receipt).');
      return;
    }
    const bid = await auctionService.getPublicBid(bidId);
    if (!bid || bid.auction_id !== auctionId) {
      showError('Invalid bid', 'Could not find this bid for this auction. Check the bid ID.');
      return;
    }
    if (bid.amount !== highestBid) {
      showError('Wrong bid', 'This bid amount does not match the highest bid. Only the highest bidder can win.');
      return;
    }
    if (!bid.bid_public_key) {
      showError('Missing data', 'Could not load bid public key. Try again.');
      return;
    }
    setIsEnding(true);
    try {
      const inputs = [
        `${bid.amount}u64`,
        auctionId,
        bid.bid_public_key,
        bidId.endsWith('field') ? bidId : `${bidId}field`,
      ];
      const params = buildSelectWinnerParams(inputs, address, walletName);
      const execute = walletName === 'Puzzle Wallet' ? requestCreateEvent : requestTransaction;
      const result = await createTransaction(params, execute, walletName, getAuctionProgramId());
      if (result.success) {
        success('Auction ended', 'Winner selected. Winner must redeem to claim.');
        setWinningBidId(bidId);
      } else {
        showError('End failed', result.error ?? 'Unknown error. Ensure you have the AuctionTicket record.');
      }
    } catch (e: unknown) {
      showError('End failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!auctionId || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Auction not found</h2>
          <p className="text-white/60 mb-6">The auction may not exist or the ID is invalid.</p>
          <Link href="/auctions">
            <GlassButton variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Auctions
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/auctions" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Auctions
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-0 mb-8 overflow-hidden">
            {imageUrl ? (
              <div className="relative h-56 w-full bg-white/[0.06]">
                <a href={imageUrl} target="_blank" rel="noreferrer">
                  <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                </a>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            ) : null}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{name}</h1>
                  <p className="text-sm text-white/50 font-mono truncate max-w-xs">ID: {auctionId.slice(0, 20)}...</p>
                </div>
              </div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-3">About this Auction</h2>
                <p className="text-white/70 leading-relaxed">{description ?? ''}</p>
              </div>
              <dl className="grid gap-4">
                <div>
                  <dt className="text-sm text-white/50">Starting bid</dt>
                  <dd className="text-lg text-emerald-400">{startingBid} credits</dd>
                </div>
                <div>
                  <dt className="text-sm text-white/50">Minimum bid</dt>
                  <dd className="text-lg text-emerald-400">{minBid} credits</dd>
                </div>
                <div className="flex gap-6">
                  <div>
                    <dt className="text-sm text-white/50 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Bids
                    </dt>
                    <dd className="text-lg text-white/80">{bidCount}</dd>
                  </div>
                  {highestBid > 0 && (
                    <div>
                      <dt className="text-sm text-white/50 flex items-center gap-1">
                        <Trophy className="w-4 h-4" /> Highest
                      </dt>
                      <dd className="text-lg text-emerald-400">{highestBid} credits</dd>
                    </div>
                  )}
                </div>
              </dl>
            </div>
          </GlassCard>

          {isCreator && (
            <GlassCard className="p-8 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Bidders
              </h2>
              {bids.length > 0 ? (
                <ul className="space-y-2 mb-4">
                  {bids.map((b, i) => (
                    <li key={i} className="flex justify-between text-sm text-white/80">
                      <span className="font-mono truncate max-w-[200px]">{b.bidId || '—'}</span>
                      <span className="text-emerald-400">{b.amount} credits</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/50 mb-4">Bid count: {bidCount}. Highest: {highestBid} credits.</p>
              )}
              {!isEnded && bidCount > 0 && (
                <>
                  <p className="text-xs text-white/40 mb-3">
                    Enter the winning bid ID (from the highest bidder&apos;s receipt) to end the auction.
                  </p>
                  <div className="flex gap-3">
                    <GlassInput
                      placeholder="Winning bid ID (e.g. 123...field)"
                      value={winningBidIdInput}
                      onChange={(e) => setWinningBidIdInput(e.target.value)}
                      className="flex-1"
                    />
                    <GlassButton
                      onClick={handleEndAuction}
                      disabled={isEnding}
                      loading={isEnding}
                      icon={<Trophy className="w-4 h-4" />}
                    >
                      {isEnding ? 'Ending…' : 'End Auction'}
                    </GlassButton>
                  </div>
                  <p className="text-xs text-amber-400/80 mt-2">
                    Note: Only the highest bid can win. Bidders do not lock funds—only the winner pays when they redeem.
                  </p>
                </>
              )}
              {isEnded && (
                <p className="text-sm text-emerald-400">Auction ended. Winner can redeem their bid.</p>
              )}
            </GlassCard>
          )}

          {isConnected && !isCreator && !isEnded && (
            <GlassCard className="p-8 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Place a bid</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <GlassInput
                  type="number"
                  placeholder="Amount (credits)"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={minBid}
                />
                <GlassButton
                  onClick={handleBid}
                  disabled={isBidding}
                  icon={isBidding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                >
                  {isBidding ? 'Placing…' : 'Place bid'}
                </GlassButton>
              </div>
              <p className="text-sm text-white/50 mt-3">
                Minimum bid: {minBid} credits. Your address will be visible to the creator.
              </p>
            </GlassCard>
          )}

          {isConnected && isCreator && !isEnded && (
            <GlassCard className="p-8 mb-8 flex items-center gap-3 text-amber-400/90">
              <Ban className="w-5 h-5 shrink-0" />
              <p className="text-sm">You cannot bid on your own auction.</p>
            </GlassCard>
          )}

          {isEnded && !isCreator && (
            <GlassCard className="p-8 mb-8 text-white/60 text-sm">
              This auction has ended. Only the winner pays when redeeming; other bidders do not lock funds.
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}
