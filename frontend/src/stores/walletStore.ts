import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string | null;
  walletType: 'leo' | 'puzzle' | null;
  isConnecting: boolean;
  error: string | null;
}

interface WalletActions {
  setConnected: (address: string, network: string, walletType: 'leo' | 'puzzle') => void;
  setDisconnected: () => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WalletState = {
  isConnected: false,
  address: null,
  network: null,
  walletType: null,
  isConnecting: false,
  error: null,
};

export const useWalletStore = create<WalletState & WalletActions>()(
  persist(
    (set) => ({
      ...initialState,

      setConnected: (address, network, walletType) =>
        set({
          isConnected: true,
          address,
          network,
          walletType,
          isConnecting: false,
          error: null,
        }),

      setDisconnected: () =>
        set({
          isConnected: false,
          address: null,
          network: null,
          walletType: null,
          isConnecting: false,
          error: null,
        }),

      setConnecting: (isConnecting) =>
        set({ isConnecting }),

      setError: (error) =>
        set({ error, isConnecting: false }),

      reset: () => set(initialState),
    }),
    {
      name: 'privote-wallet-storage',
      partialize: (state) => ({
        address: state.address,
        network: state.network,
        walletType: state.walletType,
      }),
    }
  )
);
