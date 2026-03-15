'use client';

import { useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletStore } from '@/stores/walletStore';

function inferWalletType(walletName: string | undefined) {
  const normalized = walletName?.toLowerCase() || '';

  if (normalized.includes('shield')) return 'shield' as const;
  if (normalized.includes('leo')) return 'leo' as const;
  if (normalized.includes('puzzle')) return 'puzzle' as const;
  if (normalized.includes('fox')) return 'fox' as const;
  if (normalized.includes('soter')) return 'soter' as const;
  return 'unknown' as const;
}

export function useWalletSession() {
  const walletContext = useWallet() as any;
  const walletStore = useWalletStore();

  return useMemo(() => {
    const adapterAddress =
      walletContext?.address ??
      walletContext?.publicKey ??
      walletContext?.wallet?.adapter?.account?.address ??
      null;

    const address = (adapterAddress ?? walletStore.address ?? '').toString();
    const walletName = walletContext?.wallet?.adapter?.name as string | undefined;
    const connected = !!(
      walletContext?.connected ||
      walletStore.isConnected ||
      address
    );

    return {
      ...walletContext,
      address,
      connected,
      walletName,
      walletType: inferWalletType(walletName),
      network: walletContext?.network ?? walletStore.network ?? null,
      isConnecting: !!(walletContext?.connecting || walletStore.isConnecting),
      isDisconnecting: !!walletContext?.disconnecting,
      isReconnecting: !!walletContext?.reconnecting,
    };
  }, [walletContext, walletStore.address, walletStore.isConnected, walletStore.network, walletStore.isConnecting]);
}
