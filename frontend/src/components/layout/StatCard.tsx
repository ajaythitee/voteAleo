import { ReactNode } from 'react';
import { GlassCardCompact } from '@/components/ui';

interface StatCardProps {
  label: string;
  value: string | number;
  helperText?: string;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger';
}

const accentRing: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'bg-emerald-500/20 text-emerald-400',
  success: 'bg-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/20 text-amber-300',
  danger: 'bg-rose-500/20 text-rose-300',
};

export function StatCard({
  label,
  value,
  helperText,
  icon,
  accent = 'default',
}: StatCardProps) {
  return (
    <GlassCardCompact className="flex items-center gap-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle ${accentRing[accent]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold text-white">
          {value}
        </p>
        {helperText && (
          <p className="mt-1 text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    </GlassCardCompact>
  );
}

