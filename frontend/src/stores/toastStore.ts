import { create } from 'zustand';
import { ToastNotification } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ToastState {
  toasts: ToastNotification[];
}

interface ToastActions {
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
}

export const useToastStore = create<ToastState & ToastActions>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = uuidv4();
    const newToast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove toast after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAllToasts: () => set({ toasts: [] }),

  success: (title, message) =>
    get().addToast({ type: 'success', title, message }),

  error: (title, message) =>
    get().addToast({ type: 'error', title, message, duration: 7000 }),

  info: (title, message) =>
    get().addToast({ type: 'info', title, message }),

  warning: (title, message) =>
    get().addToast({ type: 'warning', title, message }),
}));
