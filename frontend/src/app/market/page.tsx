'use client';

import Link from 'next/link';
import { PlusCircle, Store } from 'lucide-react';
import { PageShell, EmptyState } from '@/components/layout';
import { GlassButton } from '@/components/ui/GlassButton';

export default function MarketPage() {
  return (
    <PageShell
      title="Marketplace"
      description="Browse fixed-price listings."
      actions={
        <Link href="/market/sell">
          <GlassButton icon={<PlusCircle className="w-4 h-4" />}>Create listing</GlassButton>
        </Link>
      }
      maxWidth="7xl"
    >
      <EmptyState
        icon={<Store className="w-10 h-10" />}
        title="No listings yet"
        description="Marketplace listings will appear here once the market contract is deployed and wired."
        action={
          <Link href="/market/sell">
            <GlassButton variant="secondary">Create a listing</GlassButton>
          </Link>
        }
      />
    </PageShell>
  );
}

