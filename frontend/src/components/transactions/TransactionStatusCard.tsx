'use client';

import { CheckCircle2, Clock3, ExternalLink, Loader2, Send, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';

const stageConfig = {
  preparing: {
    icon: Loader2,
    className: 'text-sky-300',
    badge: 'Preparing',
  },
  submitted: {
    icon: Send,
    className: 'text-emerald-300',
    badge: 'Submitted',
  },
  awaiting: {
    icon: Clock3,
    className: 'text-amber-300',
    badge: 'Awaiting confirmation',
  },
  confirmed: {
    icon: CheckCircle2,
    className: 'text-green-300',
    badge: 'Confirmed',
  },
  failed: {
    icon: XCircle,
    className: 'text-red-300',
    badge: 'Failed',
  },
} as const;

export function TransactionStatusCard({
  state,
  explorerUrl,
}: {
  state: TransactionLifecycleState;
  explorerUrl?: string;
}) {
  if (state.stage === 'idle') {
    return null;
  }

  const config = stageConfig[state.stage];
  const Icon = config.icon;

  return (
    <GlassCard className="border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8">
          <Icon className={`h-5 w-5 ${config.className} ${state.stage === 'preparing' ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{state.title}</p>
            <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
              {config.badge}
            </span>
          </div>
          <p className="text-sm text-white/65">{state.description}</p>
          {state.transactionId ? (
            <p className="mt-2 break-all font-mono text-xs text-white/45">Tx: {state.transactionId}</p>
          ) : null}
          {explorerUrl ? (
            <div className="mt-3">
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                <GlassButton variant="secondary" size="sm" icon={<ExternalLink className="h-4 w-4" />}>
                  Open explorer
                </GlassButton>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
