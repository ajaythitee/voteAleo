'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Gavel, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { auctionService } from '@/services/auction';
import { createTransaction, requestCreateEvent, buildBidPublicParams, getAuctionProgramId } from '@/utils/transaction';

type AuctionData = {
  starting_bid?: number;
  name?: string;
  item?: { id?: string; offchain_data?: string[] };
};

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [data, setData] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);

  const { publicKey, requestTransaction, wallet } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const address = publicKey ?? '';
  const walletName = wallet?.adapter?.name;

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
          setData((raw as AuctionData) || null);
        }
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleBid = async () => {
    if (!auctionId || !address || !walletName) {
      showError('Wallet required', 'Connect a wallet to place a bid.');
      return;
    }
    const amount = Math.floor(Number(bidAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('Invalid amount', 'Enter a valid bid amount.');
      return;
    }
    const minBid = data?.starting_bid ?? 0;
    if (amount < minBid) {
      showError('Below minimum', `Bid must be at least ${minBid} credits.`);
      return;
    }
    setIsBidding(true);
    try {
      const nonce = Math.floor(Math.random() * 1e12) + 1;
      const inputs = [
        `${amount}u64`,
        auctionId,
        `${nonce}scalar`,
        'false', // publish_bidder_address
      ];
      const params = buildBidPublicParams(inputs, address, walletName);
      const execute = walletName === 'Puzzle Wallet' ? requestCreateEvent : requestTransaction;
      const result = await createTransaction(params, execute, walletName, getAuctionProgramId());
      if (result.success) {
        success('Bid placed', result.transactionId ? `Tx: ${result.transactionId.slice(0, 8)}...` : 'Check your wallet.');
        setBidAmount('');
      } else {
        showError('Bid failed', result.error ?? 'Unknown error');
      }
    } catch (e: any) {
      showError('Bid failed', e?.message ?? 'Unknown error');
    } finally {
      setIsBidding(false);
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

  const name = data.name != null ? String(data.name) : 'Untitled';
  const startingBid = Number(data.starting_bid) || 0;

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
          <GlassCard className="p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Gavel className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{name}</h1>
                <p className="text-sm text-white/50 font-mono truncate max-w-xs">ID: {auctionId.slice(0, 16)}...</p>
              </div>
            </div>
            <dl className="grid gap-4">
              <div>
                <dt className="text-sm text-white/50">Starting bid</dt>
                <dd className="text-lg text-emerald-400">{startingBid} credits</dd>
              </div>
            </dl>
          </GlassCard>

          {isConnected && (
            <GlassCard className="p-8">
              <h2 className="text-lg font-semibold text-white mb-4">Place a bid</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <GlassInput
                  type="number"
                  placeholder="Amount (credits)"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={startingBid}
                />
                <GlassButton
                  onClick={handleBid}
                  disabled={isBidding}
                  icon={isBidding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                >
                  {isBidding ? 'Placing…' : 'Place bid'}
                </GlassButton>
              </div>
              <p className="text-sm text-white/50 mt-3">Minimum bid: {startingBid} credits. Your bid is submitted on-chain.</p>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  );
}
