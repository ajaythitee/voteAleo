'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles = {
  primary:
    'bg-emerald-600 text-white border border-emerald-500/30 hover:brightness-110 ' +
    'light:bg-slate-900 light:text-white light:border-slate-900/10 light:hover:bg-slate-800',
  secondary:
    'bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.1] hover:border-white/20 ' +
    'light:bg-white light:text-slate-900 light:border-slate-900/10 light:hover:bg-slate-50',
  success:
    'bg-green-600/80 text-white border border-green-500/30 hover:brightness-110 ' +
    'light:bg-emerald-600 light:text-white light:border-emerald-700/10',
  danger:
    'bg-red-600/80 text-white border border-red-500/30 hover:brightness-110 ' +
    'light:bg-rose-600 light:text-white light:border-rose-700/10',
  ghost:
    'bg-transparent text-white/80 hover:bg-white/5 border border-transparent hover:border-white/10 ' +
    'light:text-slate-700 light:hover:bg-slate-900/5 light:hover:border-slate-900/10',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-8 py-3.5 text-lg rounded-xl',
};

export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-300
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
}

export function IconButton({
  children,
  className = '',
  ...props
}: Omit<HTMLMotionProps<'button'>, 'children'> & { children: ReactNode }) {
  return (
    <motion.button
      className={`
        p-2 rounded-xl
        bg-white/5 border border-white/10
        hover:bg-white/10 hover:border-white/20
        transition-all duration-300
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
