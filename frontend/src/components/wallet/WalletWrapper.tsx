'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { PuzzleWalletAdapter } from '@provablehq/aleo-wallet-adaptor-puzzle';
import { FoxWalletAdapter } from '@provablehq/aleo-wallet-adaptor-fox';
import { SoterWalletAdapter } from '@provablehq/aleo-wallet-adaptor-soter';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

// Program IDs for VeilProtocol (Voting + Auctions)
function normalizeProgramId(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Wallet adapters expect canonical Aleo program IDs.
  if (!/^[a-z0-9_]+\.(aleo)$/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

const PROGRAM_IDS = [
  normalizeProgramId(process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID),
  normalizeProgramId(process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID),
  'credits.aleo',
].filter((programId): programId is string => !!programId);
const APP_NAME = 'VeilProtocol';

interface WalletWrapperProps {
  children: ReactNode;
}

export function WalletWrapper({ children }: WalletWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const wallets = useMemo(() => {
    if (!isMounted || typeof window === 'undefined') {
      return [];
    }

    const instances = [];

    try {
      instances.push(new ShieldWalletAdapter({ appName: APP_NAME }));
    } catch (e) {
      console.warn('ShieldWalletAdapter constructor failed:', e);
    }

    try {
      instances.push(new LeoWalletAdapter());
    } catch (e) {
      console.warn('LeoWalletAdapter constructor failed:', e);
    }

    try {
      instances.push(new PuzzleWalletAdapter());
    } catch (e) {
      console.warn('PuzzleWalletAdapter constructor failed:', e);
    }

    try {
      instances.push(new FoxWalletAdapter());
    } catch (e) {
      console.warn('FoxWalletAdapter constructor failed:', e);
    }

    try {
      instances.push(new SoterWalletAdapter());
    } catch (e) {
      console.warn('SoterWalletAdapter constructor failed:', e);
    }

    return instances;
  }, [isMounted]);

  const onError = useCallback((error: Error) => {
    console.error('Wallet error:', error);
  }, []);

  const providerConfig = useMemo(() => {
    if (PROGRAM_IDS.length === 0) {
      return {};
    }

    return { programs: PROGRAM_IDS };
  }, []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      autoConnect
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.AutoDecrypt}
      {...providerConfig}
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}
