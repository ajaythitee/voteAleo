'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle, Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { aleoService } from '@/services/aleo';
import { PageShell } from '@/components/layout';

function ProofContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');

  const decoded = useMemo(() => {
    if (!token || typeof atob === 'undefined') return null;
    try {
      const json = decodeURIComponent(escape(atob(token)));
      const data = JSON.parse(json) as { c?: string; t?: string; a?: string };
      if (data && (data.c || data.t)) return data;
    } catch {
      // ignore
    }
    return null;
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-lg mx-auto">
        <GlassCard className="p-8 text-center">
          <Shield className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Participation Proof</h1>
          <p className="text-white/60 mb-6">
            No proof token provided. After voting, use &quot;Share proof link&quot; on the campaign page to get a shareable proof URL.
          </p>
          <Link href="/campaigns">
            <GlassButton icon={<ArrowLeft className="w-5 h-5" />}>Browse campaigns</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (!decoded) {
    return (
      <div className="max-w-lg mx-auto">
        <GlassCard className="p-8 text-center">
          <Shield className="w-16 h-16 text-amber-500/50 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Invalid proof</h1>
          <p className="text-white/60 mb-6">
            This proof link could not be verified. It may be corrupted or from an older version.
          </p>
          <Link href="/campaigns">
            <GlassButton icon={<ArrowLeft className="w-5 h-5" />}>Browse campaigns</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const campaignId = decoded.c ?? '?';
  const txId = decoded.t ?? '';
  const explorerUrl = txId ? aleoService.getExplorerUrl(txId) : '';

  return (
    <div className="max-w-lg mx-auto">
      <GlassCard className="p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-white text-center mb-2">Participation proof valid</h1>
        <p className="text-white/70 text-center mb-6">
          This link proves that a voter participated in <strong>Campaign #{campaignId}</strong> on Privote.
          No vote choice is revealed (privacy-preserving).
        </p>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Campaign</span>
            <span className="text-white">#{campaignId}</span>
          </div>
          {txId && (
            <div className="flex justify-between items-center gap-2">
              <span className="text-white/50">Transaction</span>
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                >
                  {txId.slice(0, 12)}... <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : (
                <span className="text-white/70 font-mono text-xs truncate max-w-[180px]">{txId}</span>
              )}
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/campaign/${campaignId}`}>
            <GlassButton variant="secondary" icon={<ArrowLeft className="w-5 h-5" />}>
              View campaign
            </GlassButton>
          </Link>
          <Link href="/campaigns">
            <GlassButton variant="secondary">Browse campaigns</GlassButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

export default function ProofPage() {
  return (
    <PageShell
      title="Participation proof"
      description="Verify a privacy-preserving proof that someone participated in a campaign on Privote."
      maxWidth="lg"
    >
      <Suspense
        fallback={
          <div className="max-w-lg mx-auto">
            <GlassCard className="p-8 text-center">
              <p className="text-white/60">Loading proof...</p>
            </GlassCard>
          </div>
        }
      >
        <ProofContent />
      </Suspense>
    </PageShell>
  );
}
