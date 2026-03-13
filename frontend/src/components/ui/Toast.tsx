'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import { ToastNotification } from '@/types';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-emerald-500/30 bg-emerald-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
};

const iconColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-emerald-400',
  warning: 'text-yellow-400',
};

function ToastItem({ toast }: { toast: ToastNotification }) {
  const { removeToast } = useToastStore();
  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        toast relative flex items-start gap-3 p-4
        bg-gray-900/90 backdrop-blur-xl
        border rounded-xl shadow-lg
        min-w-[320px] max-w-[420px]
        ${colors[toast.type]}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`} />

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white text-sm">{toast.title}</h4>
        <p className="mt-1 text-sm text-white/70 break-words">{toast.message}</p>
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-white/50" />
      </button>

      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 rounded-full ${iconColors[toast.type].replace('text', 'bg')}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
