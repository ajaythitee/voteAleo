'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
  variant?: 'solid' | 'glass';
  animate?: boolean;
  className?: string;
}

export function GlassCard({
  children,
  hover = true,
  glow = false,
  variant = 'solid',
  animate = false,
  className = '',
  ...props
}: GlassCardProps) {
  const baseClass = variant === 'glass'
    ? 'glass-card p-6'
    : 'rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6';

  return (
    <motion.div
      className={`
        ${baseClass}
        ${hover ? (variant === 'glass' ? 'glass-card-hover' : 'transition-colors hover:bg-white/[0.06] hover:border-white/[0.12]') : ''}
        ${glow ? 'shadow-[0_0_24px_rgba(99,102,241,0.15)]' : ''}
        ${className}
      `}
      initial={animate ? { opacity: 0, y: 12 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function GlassCardCompact({
  children,
  hover = true,
  variant = 'solid',
  className = '',
  ...props
}: GlassCardProps) {
  const baseClass = variant === 'glass'
    ? 'glass-card p-4'
    : 'rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4';

  return (
    <motion.div
      className={`
        ${baseClass}
        ${hover ? 'transition-colors hover:bg-white/[0.06] hover:border-white/[0.12]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
