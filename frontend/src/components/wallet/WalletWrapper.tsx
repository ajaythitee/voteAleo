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
const VOTING_PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;
const PROGRAM_IDS = [VOTING_PROGRAM_ID, AUCTION_PROGRAM_ID, 'credits.aleo'];
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

  return (
    <AleoWalletProvider
      wallets={wallets}
      autoConnect
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.AutoDecrypt}
      programs={PROGRAM_IDS}
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}
