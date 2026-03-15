'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Plus,
  X,
  Calendar,
  Image as ImageIcon,
  Vote,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput, GlassTextarea } from '@/components/ui/GlassInput';
import { TransactionStatusCard } from '@/components/transactions/TransactionStatusCard';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import { pinataService } from '@/services/pinata';
import { aleoService } from '@/services/aleo';
import { createTransaction, buildCreateCampaignParams, awaitTransactionConfirmation } from '@/utils/transaction';
import { Stepper } from '@/components/layout';
import { useWalletSession } from '@/hooks/useWalletSession';
import { useTransactionLifecycle } from '@/hooks/useTransactionLifecycle';
import { getFeatureAvailability, requireFeatureEnv } from '@/lib/env';
import { getWalletCapabilities } from '@/lib/walletCapabilities';

const CAMPAIGN_CATEGORIES = ['governance', 'community', 'poll', 'dao', 'other'] as const;

interface FormData {
  title: string;
  description: string;
  image: File | null;
  imagePreview: string | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  options: string[];
  minVotes?: number;
  category?: string;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  image: null,
  imagePreview: null,
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '18:00',
  options: ['', ''],
  minVotes: undefined,
  category: '',
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSuggestingOptions, setIsSuggestingOptions] = useState(false);
  const [step, setStep] = useState(1);
  const transaction = useTransactionLifecycle();

  // Get wallet info including wallet adapter name
  const { address, executeTransaction, wallet, connected, walletName, walletType, connect } = useWalletSession();
  const { isConnected, address: storeAddress } = useWalletStore();
  const { success, error: showError } = useToastStore();
  const featureAvailability = getFeatureAvailability();
  const walletCapabilities = getWalletCapabilities(walletType);

  // Use wallet adapter + store connection state
  const walletConnected = !!(connected || isConnected || address || storeAddress);

  const handleInputChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
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

  const improveWithAI = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      showError('Nothing to improve', 'Add a title or description first.');
      return;
    }
    setIsImproving(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'campaign',
          title: formData.title,
          description: formData.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error('AI suggest error:', err);
        throw new Error(err.error || `AI request failed (${res.status})`);
      }
      const data = (await res.json()) as { title?: string; description?: string };
      console.log('AI suggest response:', data);
      if (data.title || data.description) {
        if (data.title) handleInputChange('title', data.title);
        if (data.description) handleInputChange('description', data.description);
        success('Text improved', 'Title and description have been refined by AI.');
      } else {
        throw new Error('AI returned empty response');
      }
    } catch (e: unknown) {
      showError('AI suggestion failed', e instanceof Error ? e.message : 'Could not improve text');
    } finally {
      setIsImproving(false);
    }
  };

  const suggestOptionsWithAI = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      showError('Missing context', 'Add a title and description first to suggest options.');
      return;
    }
    setIsSuggestingOptions(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'campaign',
          title: formData.title,
          description: formData.description,
          suggestOptions: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error('AI suggest options error:', err);
        throw new Error(err.error || `AI request failed (${res.status})`);
      }
      const data = (await res.json()) as { title?: string; description?: string; options?: string[] };
      console.log('AI suggest options response:', data);
      
      // Update title/description if provided
      if (data.title) handleInputChange('title', data.title);
      if (data.description) handleInputChange('description', data.description);
      
      // Update options if provided
      if (data.options && data.options.length >= 2) {
        // Ensure we have at least 2 options (required), no upper limit
        const validOptions = data.options;
        // Pad to match current form length if needed, but keep at least 2
        const currentLength = Math.max(formData.options.length, 2);
        const newOptions = [...validOptions];
        while (newOptions.length < currentLength) {
          newOptions.push('');
        }
        handleInputChange('options', newOptions);
        success('Options suggested', `AI suggested ${validOptions.length} voting options.`);
      } else {
        console.error('AI returned invalid options:', data.options);
        showError('Invalid suggestions', `AI did not return valid options (got ${data.options?.length || 0}, need at least 2).`);
      }
    } catch (e: unknown) {
      showError('AI suggestion failed', e instanceof Error ? e.message : 'Could not suggest options');
    } finally {
      setIsSuggestingOptions(false);
    }
  };

  const removeImage = () => {
    handleInputChange('image', null);
    handleInputChange('imagePreview', null);
  };

  const addOption = () => {
    handleInputChange('options', [...formData.options, '']);
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      handleInputChange(
        'options',
        formData.options.filter((_, i) => i !== index)
      );
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    handleInputChange('options', newOptions);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (startDateTime >= endDateTime) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (startDateTime < new Date()) {
      newErrors.startDate = 'Start date must be in the future';
    }

    const validOptions = formData.options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!walletConnected) {
      showError('Wallet Required', 'Please connect your wallet to create a campaign');
      return;
    }

    setIsSubmitting(true);
    transaction.setPreparing('Preparing campaign transaction', 'Uploading metadata and validating your campaign configuration.');

    try {
      requireFeatureEnv('campaigns', 'Campaign creation is not configured. Add NEXT_PUBLIC_VOTING_PROGRAM_ID before deploying.');
      requireFeatureEnv('pinata', 'Campaign metadata uploads are disabled because NEXT_PUBLIC_PINATA_JWT is missing.');

      // Upload image to IPFS if provided
      let imageCid = '';
      if (formData.image) {
        const imageResult = await pinataService.uploadFile(formData.image);
        imageCid = imageResult.cid;
      }

      // Upload metadata to IPFS
      const metadata: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        options: formData.options.filter((opt) => opt.trim()),
        creator: address || 'anonymous',
        createdAt: new Date().toISOString(),
        imageCid,
      };
      if (formData.minVotes != null && formData.minVotes > 0) metadata.minVotes = formData.minVotes;
      if (formData.category?.trim()) metadata.category = formData.category.trim();

      const metadataResult = await pinataService.uploadJSON(metadata, { name: `campaign-${Date.now()}.json`, type: 'campaign-metadata' });

      // Create campaign on-chain
      const startTime = Math.floor(
        new Date(`${formData.startDate}T${formData.startTime}`).getTime() / 1000
      );
      const endTime = Math.floor(
        new Date(`${formData.endDate}T${formData.endTime}`).getTime() / 1000
      );

      const validOptions = formData.options.filter((opt) => opt.trim());

      // Encode CID to fields
      const { part1, part2 } = aleoService.encodeCidToFields(metadataResult.cid);

      const inputs = [part1, part2, `${startTime}u64`, `${endTime}u64`, `${validOptions.length}u8`];
      const params = buildCreateCampaignParams(inputs);
      const result = await createTransaction(params, executeTransaction, walletName, {
        recoverConnection: connect,
      });

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      transaction.setSubmitted(
        'Campaign submitted',
        'Your wallet accepted the transaction. We are waiting for the network indexer to catch up.',
        result.transactionId
      );

      const confirmation = await awaitTransactionConfirmation(result.transactionId, aleoService.checkTransactionStatus.bind(aleoService));

      if (confirmation.confirmed) {
        transaction.setConfirmed(
          'Campaign confirmed',
          'The campaign transaction has been confirmed on-chain and should appear in the listing shortly.',
          result.transactionId
        );
      } else {
        transaction.setAwaiting(
          'Campaign awaiting confirmation',
          'The transaction was submitted successfully. If the explorer is still catching up, the campaign may take a little longer to appear.',
          result.transactionId
        );
      }

      success(
        'Campaign submitted',
        result.transactionId
          ? `Transaction ${result.transactionId.slice(0, 12)}... was submitted successfully.`
          : 'Your campaign transaction was submitted successfully.'
      );
      router.push('/campaigns');
    } catch (err: unknown) {
      console.error('Create campaign error:', err);
      const message = err instanceof Error ? err.message : 'Transaction failed';
      transaction.setFailed('Campaign creation failed', message);
      showError('Failed to create campaign', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.1)_45%,rgba(251,146,60,0.15))] p-6 shadow-[0_30px_80px_-45px_rgba(14,116,144,0.8)]">
          <div className="pointer-events-none absolute" />
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Private voting</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Shield ready</span>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Create a campaign people actually want to join</h1>
          <p className="max-w-2xl text-sm text-white/72">
            Shape the message, options, and timeline in one flow. Every supported wallet can submit, and Shield users get a smoother privacy-first experience.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <GlassCard className="border-white/10 bg-white/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Wallet compatibility
            </div>
            <p className="text-sm text-white/65">
              {walletName
                ? `${walletName}: ${walletCapabilities.summary}`
                : 'Campaign creation works with all supported wallets. Shield is optional here, not required.'}
            </p>
          </GlassCard>
          <GlassCard className="border-white/10 bg-white/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <AlertCircle className="h-4 w-4 text-amber-300" />
              Deployment readiness
            </div>
            <p className="text-sm text-white/65">
              {featureAvailability.campaignTransactionsReady && featureAvailability.pinataReady
                ? `Campaign program, metadata uploads, and ${featureAvailability.network} network settings are configured.`
                : 'Campaign creation needs environment setup before it is safe to deploy.'}
            </p>
          </GlassCard>
        </div>

        <TransactionStatusCard
          state={transaction.state}
          explorerUrl={transaction.state.transactionId ? aleoService.getExplorerUrl(transaction.state.transactionId) : undefined}
        />

        <Stepper
          steps={[
            { id: 'info', label: 'Basic info', description: 'Title, description, and category' },
            { id: 'options', label: 'Options', description: 'Define what people can vote for' },
            { id: 'schedule', label: 'Schedule', description: 'Set voting period and quorum' },
          ]}
          currentStepId={step === 1 ? 'info' : step === 2 ? 'options' : 'schedule'}
          className="mb-8"
        />

        {/* Form Card */}
        <GlassCard className="p-8 border-white/10 shadow-[0_30px_80px_-48px_rgba(2,132,199,0.9)]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Basic Information
              </h2>

              <GlassInput
                label="Campaign Title"
                placeholder="Enter a descriptive title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                error={errors.title}
              />

              <GlassTextarea
                label="Description"
                placeholder="Describe what this campaign is about..."
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

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Category (optional)
                </label>
                <select
                  value={formData.category ?? ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all [&>option]:bg-gray-900 [&>option]:text-white"
                >
                  <option value="">Select category</option>
                  {CAMPAIGN_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-gray-900 text-white">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Campaign Image (Optional)
                </label>
                {formData.imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 cursor-pointer transition-colors">
                    <Upload className="w-10 h-10 text-white/30 mb-2" />
                    <span className="text-white/50 text-sm">Click to upload image</span>
                    <span className="text-white/30 text-xs mt-1">Max 5MB (JPG, PNG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end">
                <GlassButton onClick={() => setStep(2)}>
                  Next: Voting Options
                </GlassButton>
              </div>
            </div>
          )}

          {/* Step 2: Voting Options */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Voting Options
              </h2>

              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-white/60 text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <GlassInput
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                    </div>
                    {formData.options.length > 2 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <X className="w-5 h-5 text-red-400" />
                      </button>
                    )}
                  </div>
                ))}

                {errors.options && (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.options}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={addOption}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={suggestOptionsWithAI}
                    loading={isSuggestingOptions}
                    disabled={isSuggestingOptions || !formData.title.trim()}
                    className="ml-auto"
                  >
                    {isSuggestingOptions ? 'Suggesting…' : 'Suggest Options with AI'}
                  </GlassButton>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <GlassButton variant="secondary" onClick={() => setStep(1)}>
                  Back
                </GlassButton>
                <GlassButton onClick={() => setStep(3)}>
                  Next: Schedule
                </GlassButton>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-6">
                Voting Schedule
              </h2>

              {/* Start Date & Time */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Voting Starts
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                    {errors.startDate && (
                      <p className="text-xs text-red-400 mt-1">{errors.startDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Minimum votes (quorum) - optional */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Minimum votes / Quorum (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 10"
                  value={formData.minVotes ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleInputChange('minVotes', v === '' ? undefined : Math.max(0, parseInt(v, 10) || 0));
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <p className="text-xs text-white/50 mt-1">Results can show quorum status; leave empty for no minimum.</p>
              </div>

              {/* End Date & Time */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Voting Ends
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                    {errors.endDate && (
                      <p className="text-xs text-red-400 mt-1">{errors.endDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-medium text-white/70 mb-3">Campaign Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Title:</span>
                    <span className="text-white">{formData.title || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Options:</span>
                    <span className="text-white">{formData.options.filter((o) => o.trim()).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Duration:</span>
                    <span className="text-white">
                      {formData.startDate && formData.endDate
                        ? `${formData.startDate} to ${formData.endDate}`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Wallet:</span>
                    <span className="text-white">
                      {wallet?.adapter?.name || 'Not Connected'}
                    </span>
                  </div>
                  {formData.category && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Category:</span>
                      <span className="text-white capitalize">{formData.category}</span>
                    </div>
                  )}
                  {formData.minVotes != null && formData.minVotes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Quorum:</span>
                      <span className="text-white">{formData.minVotes} votes</span>
                    </div>
                  )}
                </div>
              </div>

              {!walletConnected && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-sm text-yellow-400 font-medium">Wallet Required</p>
                      <p className="text-xs text-white/50 mt-1">
                        Please connect your wallet to create a campaign. You'll need Aleo credits to pay transaction fees.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <GlassButton variant="secondary" onClick={() => setStep(2)}>
                  Back
                </GlassButton>
                <GlassButton
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={!walletConnected}
                  icon={<Vote className="w-5 h-5" />}
                >
                  {isSubmitting ? 'Creating...' : 'Create Campaign'}
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
