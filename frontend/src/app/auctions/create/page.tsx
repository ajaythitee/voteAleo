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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { publicKey, requestTransaction, wallet } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const address = publicKey ?? '';
  const walletName = wallet?.adapter?.name;

  const handleInputChange = (field: string, value: string) => {
    if (field === 'name') setName(value);
    else if (field === 'itemId') setItemId(value);
    else if (field === 'startingBid') setStartingBid(value);
    else if (field === 'bidType') setBidType(value as '1' | '2');
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Auction name is required';
    const startBid = Math.floor(Number(startingBid));
    if (!Number.isFinite(startBid) || startBid < 0) newErrors.startingBid = 'Enter a valid starting bid (credits)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
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
        `${Math.floor(Number(startingBid))}u64`,
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
    } catch (e: unknown) {
      showError('Create failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        <GlassCard className="p-8 max-w-md text-center rounded-[16px]">
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
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header - same as Create Campaign */}
        <div className="mb-8">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Auctions
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Create public auction</h1>
          <p className="text-white/60">Set up a new first-price sealed-bid auction on Aleo</p>
        </div>

        {/* Form Card - same style as Create Campaign */}
        <GlassCard className="p-8 rounded-[16px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <GlassInput
              label="Auction name"
              placeholder="e.g. Rare NFT #1"
              value={name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
            />

            <GlassInput
              label="Item ID (optional)"
              placeholder="0 or any identifier"
              value={itemId}
              onChange={(e) => handleInputChange('itemId', e.target.value)}
            />

            <GlassInput
              label="Starting bid (credits)"
              type="number"
              min={0}
              placeholder="0"
              value={startingBid}
              onChange={(e) => handleInputChange('startingBid', e.target.value)}
              error={errors.startingBid}
            />

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Bid types accepted</label>
              <select
                value={bidType}
                onChange={(e) => handleInputChange('bidType', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              >
                <option value="1">Public bids only</option>
                <option value="2">Public and private (mix)</option>
              </select>
            </div>

            <div className="pt-4">
              <GlassButton
                type="submit"
                disabled={isSubmitting}
                icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                className="w-full"
              >
                {isSubmitting ? 'Creating…' : 'Create auction'}
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
