import { ReactNode } from 'react';
import { GlassCard } from '@/components/ui';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <GlassCard
      variant="solid"
      hover={false}
      className={`flex flex-col items-center justify-center text-center py-10 sm:py-12 ${className}`}
    >
      {icon && (
        <div className="mb-4 text-emerald-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-text-subtle max-w-md">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </GlassCard>
  );
}

