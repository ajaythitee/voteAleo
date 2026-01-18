'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
  className?: string;
}

export function GlassCard({
  children,
  hover = true,
  glow = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={`
        glass-card p-6
        ${hover ? 'glass-card-hover' : ''}
        ${glow ? 'shadow-glow' : ''}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function GlassCardCompact({
  children,
  hover = true,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={`
        glass-card p-4
        ${hover ? 'glass-card-hover' : ''}
        ${className}
      `}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
