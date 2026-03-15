'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gavel, ArrowLeft, Loader2, AlertCircle, Upload, X, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput, GlassTextarea } from '@/components/ui/GlassInput';
import { TransactionStatusCard } from '@/components/transactions/TransactionStatusCard';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
import { createTransaction, buildCreatePublicAuctionParams, awaitTransactionConfirmation, isTemporaryWalletTransactionId } from '@/utils/transaction';
import { Stepper } from '@/components/layout';
import { useWalletSession } from '@/hooks/useWalletSession';
import { useTransactionLifecycle } from '@/hooks/useTransactionLifecycle';
import { getFeatureAvailability, requireFeatureEnv } from '@/lib/env';
import { getPrivateAuctionWalletWarning, getWalletCapabilities } from '@/lib/walletCapabilities';
import { auctionService } from '@/services/auction';

export default function CreateAuctionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isImproving, setIsImproving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image: File | null;
    imagePreview: string | null;
    itemId: string;
    startingBid: string;
    bidType: '0' | '1' | '2';
    revealCreator: boolean;
  }>({
    name: '',
    description: '',
    image: null,
    imagePreview: null,
    itemId: '',
    startingBid: '',
    bidType: '2',
    revealCreator: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const transaction = useTransactionLifecycle();

  const { address, executeTransaction, wallet, connected, walletName, walletType, connect, transactionStatus } = useWalletSession();
  const { isConnected, address: storeAddress } = useWalletStore();
  const { success, error: showError, info } = useToastStore();
  const walletConnected = !!(connected || isConnected || address || storeAddress);
  const featureAvailability = getFeatureAvailability();
  const walletCapabilities = getWalletCapabilities(walletType);
  const privateWalletWarning = getPrivateAuctionWalletWarning(walletType);

  const handleInputChange = (field: keyof typeof formData, value: (typeof formData)[keyof typeof formData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors((p) => ({ ...p, [field as string]: '' }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError('File too large', 'Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('image', file);
        handleInputChange('imagePreview', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    handleInputChange('image', null);
    handleInputChange('imagePreview', null);
  };

  const improveWithAI = async () => {
    if (!formData.name.trim() && !formData.description.trim()) {
      showError('Nothing to improve', 'Add a name or description first.');
      return;
    }
    setIsImproving(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'auction',
          title: formData.name,
          description: formData.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('AI suggest error:', err);
        throw new Error(err.error || `AI request failed (${res.status})`);
      }
      const data = (await res.json()) as { title?: string; description?: string };
      console.log('AI suggest response:', data);
      if (data.title || data.description) {
        if (data.title) handleInputChange('name', data.title);
        if (data.description) handleInputChange('description', data.description);
        success('Text improved', 'Auction name and description have been refined by AI.');
      } else {
        throw new Error('AI returned empty response');
      }
    } catch (e: unknown) {
      console.error('AI improve error:', e);
      showError('AI suggestion failed', e instanceof Error ? e.message : 'Could not improve text');
    } finally {
      setIsImproving(false);
    }
  };

  const validateDetailsStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Auction name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Auction name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    const startBid = Math.floor(Number(formData.startingBid));
    if (!Number.isFinite(startBid) || startBid < 0) newErrors.startingBid = 'Enter a valid starting bid (credits)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const waitForAuctionVisibility = async (previousCount: number) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const currentCount = await auctionService.getAuctionCount();
      if (currentCount > previousCount) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return false;
  };

  const checkWalletAwareStatus = async (transactionId: string) => {
    if (transactionStatus) {
      try {
        const result = await transactionStatus(transactionId);
        if (typeof result === 'string') {
          return { status: result, transactionId };
        }

        if (result && typeof result === 'object') {
          const statusValue =
            'status' in result && typeof result.status === 'string'
              ? result.status
              : 'pending';
          const resolvedTransactionId =
            'transactionId' in result && typeof result.transactionId === 'string'
              ? result.transactionId
              : transactionId;

          return { status: statusValue, transactionId: resolvedTransactionId };
        }
      } catch (error) {
        if (
          isTemporaryWalletTransactionId(transactionId) &&
          error instanceof Error &&
          error.message.includes('Transaction not found for given transaction ID')
        ) {
          return { status: 'pending', transactionId };
        }
        console.warn('Wallet transactionStatus failed, falling back to RPC:', error);
      }
    }

    if (isTemporaryWalletTransactionId(transactionId)) {
      return { status: 'pending', transactionId };
    }

    const fallback = await aleoService.checkTransactionStatus(transactionId);
    return fallback ? { ...fallback, transactionId } : null;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!walletConnected || !walletName) {
      showError('Wallet required', 'Connect a wallet to create an auction.');
      return;
    }
    if (formData.bidType !== '1' && privateWalletWarning) {
      showError('Shield recommended', privateWalletWarning);
      return;
    }

    setIsSubmitting(true);
    transaction.setPreparing('Preparing auction transaction', 'Uploading metadata and validating the auction privacy configuration.');
    try {
      requireFeatureEnv('auctions', 'Auction creation is not configured. Add NEXT_PUBLIC_AUCTION_PROGRAM_ID before deploying.');
      requireFeatureEnv('pinata', 'Auction metadata uploads are disabled because NEXT_PUBLIC_PINATA_JWT is missing.');

      // Upload image + metadata to IPFS
      let imageCid = '';
      if (formData.image) {
        const imageResult = await pinataService.uploadFile(formData.image);
        imageCid = imageResult.cid;
      }

      const metadata = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        creator: address,
        createdAt: new Date().toISOString(),
        imageCid,
        itemId: formData.itemId.trim(),
        startingBid: Math.floor(Number(formData.startingBid)),
        bidType: formData.bidType,
      } satisfies Record<string, unknown>;

      const metadataResult = await pinataService.uploadJSON(metadata, {
        name: `auction-${Date.now()}.json`,
        type: 'auction-metadata',
      });
      const previousAuctionCount = await auctionService.getAuctionCount();
      const { part1, part2 } = aleoService.encodeCidToFields(metadataResult.cid);

      const auctionNameField = aleoService.encodeStringToSingleField(formData.name.trim());
      const itemIdClean = formData.itemId.trim() || '0';
      const itemIdField = itemIdClean.match(/^\d+$/) ? `${itemIdClean}field` : aleoService.encodeStringToSingleField(itemIdClean);
      const offchainFields = [part1, part2, '0field', '0field'];
      // Leo expects the [field; 4] as a single array argument, not 4 separate field inputs
      const offchainArray = `[${offchainFields.join(', ')}]`;
      const nonce = Math.floor(Math.random() * 1e15) + 1;
      const inputs = [
        auctionNameField,
        `${formData.bidType}field`,
        itemIdField,
        offchainArray,
        `${Math.floor(Number(formData.startingBid))}u64`,
        `${nonce}scalar`,
        formData.revealCreator ? 'true' : 'false',
      ];
      const params = buildCreatePublicAuctionParams(inputs);
      const result = await createTransaction(params, executeTransaction, walletName, {
        recoverConnection: connect,
      });
      if (result.success) {
        transaction.setSubmitted(
          'Auction submitted',
          'Your wallet accepted the auction transaction. Waiting for the auction mapping to become visible on-chain.',
          result.transactionId
        );
        const confirmation = await awaitTransactionConfirmation(result.transactionId, checkWalletAwareStatus, {
          attempts: 120,
          delayMs: 1000,
        });
        const isTemporaryId = isTemporaryWalletTransactionId(result.transactionId);
        const resolvedTransactionId = confirmation.transactionId ?? result.transactionId;
        if (confirmation.confirmed) {
          transaction.setConfirmed(
            'Auction confirmed',
            'The auction transaction has been confirmed on-chain and should appear shortly.',
            resolvedTransactionId
          );
        } else {
          transaction.setAwaiting(
            'Auction awaiting confirmation',
            'The transaction was submitted successfully. Indexers can take a moment to surface the new auction.',
            resolvedTransactionId
          );
        }
        transaction.setAwaiting(
          'Refreshing auction listings',
          'Waiting for the new auction to appear before refreshing the auction pages.',
          resolvedTransactionId
        );
        const becameVisible = await waitForAuctionVisibility(previousAuctionCount);
        if (!becameVisible) {
          transaction.setFailed(
            'Auction broadcast not confirmed',
            isTemporaryId
              ? 'Shield accepted the signature, but no on-chain transaction was confirmed and the auction never appeared. Treat this attempt as failed and retry.'
              : 'The wallet accepted the request, but no on-chain transaction was confirmed and the auction never appeared.',
            resolvedTransactionId
          );
          showError(
            'Auction creation failed',
            isTemporaryId
              ? 'Shield signed the request but never completed the broadcast. No credits were deducted and no auction was created.'
              : 'The transaction did not become visible on-chain, so the auction was not created.'
          );
          return;
        }
        router.push('/auctions');
        router.refresh();
        transaction.setConfirmed(
          'Auction ready',
          'The auction is visible on-chain and the listings have been refreshed.',
          resolvedTransactionId
        );
        success('Auction created', 'Your auction is now visible on-chain.');
      } else {
        transaction.setFailed('Auction creation failed', result.error ?? 'Unknown error', result.transactionId);
        showError('Create failed', result.error ?? 'Unknown error');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      transaction.setFailed('Auction creation failed', message);
      showError('Create failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!walletConnected) {
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
        <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,118,110,0.22),rgba(56,189,248,0.09)_40%,rgba(249,115,22,0.18))] p-6 shadow-[0_30px_80px_-45px_rgba(15,118,110,0.8)]">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Auctions
          </Link>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Sealed bid</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Public + private</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Shield ready</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Launch an auction that feels premium, not placeholder</h1>
          <p className="text-white/72 text-sm max-w-2xl">
            Configure the item, starting bid, and privacy mode for your first-price sealed-bid auction on Aleo, with private-record flows covered for Shield users.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <GlassCard className="border-white/10 bg-white/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Wallet capability
            </div>
            <p className="text-sm text-white/65">
              {walletName ? `${walletName}: ${walletCapabilities.summary}` : 'All supported wallets can connect, but Shield is the safe choice for private or mixed auctions.'}
            </p>
          </GlassCard>
          <GlassCard className="border-white/10 bg-white/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <AlertCircle className="h-4 w-4 text-amber-300" />
              Deployment readiness
            </div>
            <p className="text-sm text-white/65">
              {featureAvailability.auctionTransactionsReady && featureAvailability.pinataReady
                ? `Auction program, metadata uploads, and ${featureAvailability.network} network settings are configured.`
                : 'Auction creation needs environment setup before it is safe to deploy.'}
            </p>
          </GlassCard>
        </div>

        <TransactionStatusCard
          state={transaction.state}
          explorerUrl={transaction.state.transactionId ? aleoService.getExplorerUrl(transaction.state.transactionId) : undefined}
        />

        <Stepper
          steps={[
            { id: 'details', label: 'Details', description: 'Name, description, and image' },
            { id: 'settings', label: 'Settings', description: 'Starting bid and visibility' },
          ]}
          currentStepId={step === 1 ? 'details' : 'settings'}
          className="mb-8"
        />

        {/* Form Card */}
        <GlassCard className="p-8 rounded-[16px] border-white/10 shadow-[0_30px_80px_-48px_rgba(14,116,144,0.95)]">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-2">Basic Information</h2>

              <GlassInput
                label="Auction name"
                placeholder="e.g. Rare NFT #1"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
              />

              <GlassTextarea
                label="Description"
                placeholder="Describe what is being auctioned…"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={errors.description}
              />

              <div className="flex justify-end">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={improveWithAI}
                  loading={isImproving}
                  disabled={isImproving}
                >
                  {isImproving ? 'Improving…' : 'Improve with AI'}
                </GlassButton>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Auction image (optional)</label>
                {formData.imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={formData.imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
                      type="button"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 cursor-pointer transition-colors">
                    <Upload className="w-10 h-10 text-white/30 mb-2" />
                    <span className="text-white/50 text-sm">Click to upload image</span>
                    <span className="text-white/30 text-xs mt-1">Max 5MB (JPG, PNG)</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex justify-end">
                <GlassButton
                  onClick={() => {
                    if (validateDetailsStep()) {
                      setStep(2);
                    }
                  }}
                >
                  Next: Auction Settings
                </GlassButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-2">Auction Settings</h2>

              <GlassInput
                label="Item ID (optional)"
                placeholder="0 or any identifier"
                value={formData.itemId}
                onChange={(e) => handleInputChange('itemId', e.target.value)}
              />

              <GlassInput
                label="Starting bid (credits)"
                type="number"
                min={0}
                placeholder="0"
                value={formData.startingBid}
                onChange={(e) => handleInputChange('startingBid', e.target.value)}
                error={errors.startingBid}
              />

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Bid types accepted</label>
                <select
                  value={formData.bidType}
                  onChange={(e) => handleInputChange('bidType', e.target.value as '0' | '1' | '2')}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all [&>option]:bg-gray-900 [&>option]:text-white"
                >
                  <option value="0" className="bg-gray-900 text-white">Private bids only</option>
                  <option value="1" className="bg-gray-900 text-white">Public bids only</option>
                  <option value="2" className="bg-gray-900 text-white">Public and private (mixed)</option>
                </select>
                <p className="mt-2 text-xs text-white/50">
                  Shield Wallet is recommended for private and mixed auctions because those flows rely on Aleo records.
                </p>
              </div>

              {/* Reveal creator toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm text-white/80 font-medium">Reveal creator address</p>
                  <p className="text-xs text-white/50">If enabled, your address is shown as the auction owner (needed for “Created by me”).</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('revealCreator', !formData.revealCreator)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${formData.revealCreator ? 'bg-emerald-600' : 'bg-white/20'}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${formData.revealCreator ? 'translate-x-7' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <GlassButton variant="secondary" onClick={() => setStep(1)}>
                  Back
                </GlassButton>
                <GlassButton
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  icon={<Gavel className="w-5 h-5" />}
                >
                  {isSubmitting ? 'Creating…' : 'Create Auction'}
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
