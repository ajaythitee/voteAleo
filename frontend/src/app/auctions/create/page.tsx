'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gavel, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { aleoService } from '@/services/aleo';
import { createTransaction, requestCreateEvent, buildCreatePublicAuctionParams, getAuctionProgramId } from '@/utils/transaction';

export default function CreateAuctionPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [itemId, setItemId] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [bidType, setBidType] = useState<'1' | '2'>('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { publicKey, requestTransaction, wallet } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const address = publicKey ?? '';
  const walletName = wallet?.adapter?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Name required', 'Enter an auction name.');
      return;
    }
    const startBid = Math.floor(Number(startingBid));
    if (!Number.isFinite(startBid) || startBid < 0) {
      showError('Invalid bid', 'Enter a valid starting bid (credits).');
      return;
    }
    if (!address || !walletName) {
      showError('Wallet required', 'Connect a wallet to create an auction.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auctionNameField = aleoService.encodeStringToSingleField(name.trim());
      const itemIdField = (itemId.trim() || '0').match(/^\d+$/) ? `${itemId.trim()}field` : aleoService.encodeStringToSingleField(itemId.trim() || '0');
      const offchain = ['0field', '0field', '0field', '0field'];
      const nonce = Math.floor(Math.random() * 1e15) + 1;
      const inputs = [
        auctionNameField,
        `${bidType}field`,
        itemIdField,
        ...offchain,
        `${startBid}u64`,
        `${nonce}scalar`,
        'false',
      ];
      const params = buildCreatePublicAuctionParams(inputs, address, walletName);
      const execute = walletName === 'Puzzle Wallet' ? requestCreateEvent : requestTransaction;
      const result = await createTransaction(params, execute, walletName, getAuctionProgramId());
      if (result.success) {
        success('Auction created', result.transactionId ? `Tx: ${result.transactionId.slice(0, 8)}...` : 'Check your wallet.');
        router.push('/auctions');
      } else {
        showError('Create failed', result.error ?? 'Unknown error');
      }
    } catch (e: any) {
      showError('Create failed', e?.message ?? 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connect your wallet</h2>
          <p className="text-white/60 mb-6">You need to connect a wallet to create an auction.</p>
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
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/auctions" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Auctions
        </Link>

        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Gavel className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create public auction</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Auction name</label>
              <GlassInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rare NFT #1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Item ID (optional)</label>
              <GlassInput
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="0 or any identifier"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Starting bid (credits)</label>
              <GlassInput
                type="number"
                min={0}
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Bid types accepted</label>
              <select
                value={bidType}
                onChange={(e) => setBidType(e.target.value as '1' | '2')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="1">Public bids only</option>
                <option value="2">Public and private (mix)</option>
              </select>
            </div>
            <GlassButton
              type="submit"
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
              className="w-full"
            >
              {isSubmitting ? 'Creating…' : 'Create auction'}
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
