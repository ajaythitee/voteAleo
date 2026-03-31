'use client';

import { GlassCard } from '@/components/ui/GlassCard';

type Props = {
  strategy?: 'first_price' | 'vickrey' | 'dutch' | 'english';
  tokenType?: 'aleo' | 'usdcx' | 'usad';
};

export function PrivacyMonitor({ strategy, tokenType }: Props) {
  const mode = strategy ?? 'first_price';
  const token = tokenType ?? 'aleo';
  return (
    <GlassCard className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Privacy monitor</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Network sees</p>
          <p className="mt-2 text-xs text-white/70">Auction hash, status, bid count, winner hash.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">You see</p>
          <p className="mt-2 text-xs text-white/70">{mode} flow, token {token}, highest and second-highest where applicable.</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Hidden</p>
          <p className="mt-2 text-xs text-white/70">Bid nonce, private records, non-winning bid details.</p>
        </div>
      </div>
    </GlassCard>
  );
}
