'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gavel, ArrowLeft, Loader2, AlertCircle, Upload, X, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput, GlassTextarea } from '@/components/ui/GlassInput';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
import { createTransaction, requestCreateEvent, buildCreatePublicAuctionParams, getAuctionProgramId } from '@/utils/transaction';
import { Stepper } from '@/components/layout';

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
    bidType: '1' | '2';
    revealCreator: boolean;
  }>({
    name: '',
    description: '',
    image: null,
    imagePreview: null,
    itemId: '',
    startingBid: '',
    bidType: '1',
    revealCreator: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { publicKey, requestTransaction, wallet } = useWallet();
  const { isConnected } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const address = publicKey ?? '';
  const walletName = wallet?.adapter?.name;

  const handleInputChange = (field: keyof typeof formData, value: any) => {
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
        throw new Error(err.error || 'AI could not improve text');
      }
      const data = (await res.json()) as { title?: string; description?: string };
      if (data.title) handleInputChange('name', data.title);
      if (data.description) handleInputChange('description', data.description);
      success('Text improved', 'Auction name and description have been refined by AI.');
    } catch (e: any) {
      showError('AI suggestion failed', e?.message || 'Could not improve text');
    } finally {
      setIsImproving(false);
    }
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

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!address || !walletName) {
      showError('Wallet required', 'Connect a wallet to create an auction.');
      return;
    }

    setIsSubmitting(true);
    try {
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
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Auctions
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Create auction</h1>
          <p className="text-white/60 text-sm">
            Configure the item, starting bid, and privacy for your first-price sealed-bid auction on Aleo.
          </p>
        </div>

        <Stepper
          steps={[
            { id: 'details', label: 'Details', description: 'Name, description, and image' },
            { id: 'settings', label: 'Settings', description: 'Starting bid and visibility' },
          ]}
          currentStepId={step === 1 ? 'details' : 'settings'}
          className="mb-8"
        />

        {/* Form Card */}
        <GlassCard className="p-8 rounded-[16px]">
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
                <GlassButton onClick={() => setStep(2)}>Next: Auction Settings</GlassButton>
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
                  onChange={(e) => handleInputChange('bidType', e.target.value as '1' | '2')}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="1">Public bids only</option>
                  <option value="2">Public and private (mix)</option>
                </select>
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
