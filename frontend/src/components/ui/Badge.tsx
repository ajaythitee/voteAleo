'use client';

import { ReactNode } from 'react';

const variants = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  upcoming: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ended: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  category: 'bg-white/10 text-white/90 border-border-subtle',
  voted: 'bg-green-500/20 text-green-400 border-green-500/30',
  'your-campaign': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  featured: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  variant,
  children,
  className = '',
  icon,
}: {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
        ${variants[variant]}
        ${className}
      `}
    >
      {icon}
      {children}
    </span>
  );
}
