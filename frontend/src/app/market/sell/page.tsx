'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Tag } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput, GlassTextarea, GlassSelect } from '@/components/ui/GlassInput';
import { useToastStore } from '@/stores/toastStore';

export default function SellPage() {
  const { error } = useToastStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tokenType, setTokenType] = useState<'aleo' | 'usdcx' | 'usad'>('aleo');

  return (
    <PageShell
      title="Create listing"
      description="Fixed-price sale (coming online soon)."
      actions={
        <Link href="/market">
          <GlassButton variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </GlassButton>
        </Link>
      }
      maxWidth="3xl"
    >
      <GlassCard className="p-6">
        <div className="grid gap-4">
          <GlassInput placeholder="Listing title" value={name} onChange={(e) => setName(e.target.value)} />
          <GlassTextarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
            <GlassSelect
              value={tokenType}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'aleo' || v === 'usdcx' || v === 'usad') setTokenType(v);
              }}
              options={[
                { label: 'ALEO', value: 'aleo' },
                { label: 'USDCx', value: 'usdcx' },
                { label: 'USAD', value: 'usad' },
              ]}
            />
          </div>
          <GlassButton
            icon={<Tag className="w-4 h-4" />}
            onClick={() => error('Not wired yet', 'Marketplace transactions will be enabled after wiring market program ID + transaction builders.')}
          >
            Create listing
          </GlassButton>
        </div>
      </GlassCard>
    </PageShell>
  );
}
