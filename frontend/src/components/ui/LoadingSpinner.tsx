'use client';

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner ${sizeStyles[size]} ${className}`} />
  );
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="glass-card p-8 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-white/70">{message}</p>
      </div>
    </motion.div>
  );
}

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-emerald-500"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="flex items-center gap-2">
          <span className="text-white/70">Loading</span>
          <LoadingDots />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-40 bg-white/5 rounded-xl mb-4" />
      <div className="h-6 bg-white/5 rounded-lg w-3/4 mb-3" />
      <div className="h-4 bg-white/5 rounded-lg w-full mb-2" />
      <div className="h-4 bg-white/5 rounded-lg w-2/3" />
    </div>
  );
}
