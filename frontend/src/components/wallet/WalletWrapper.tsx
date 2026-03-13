'use client';

<<<<<<< HEAD
import { ReactNode, useCallback, useMemo } from 'react';
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
=======
import { useMemo, ReactNode, useCallback } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import {
  PuzzleWalletAdapter,
  FoxWalletAdapter,
  SoterWalletAdapter,
} from 'aleo-adapters';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';
>>>>>>> 3f3da63b9a41d76fdc24cf22f7b5c9b54646e6ea

// Program IDs for VeilProtocol (Voting + Auctions)
const VOTING_PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;
const PROGRAM_IDS = [VOTING_PROGRAM_ID, AUCTION_PROGRAM_ID, 'credits.aleo'];

interface WalletWrapperProps {
  children: ReactNode;
}

export function WalletWrapper({ children }: WalletWrapperProps) {
<<<<<<< HEAD
  const wallets = useMemo(() => {
    const instances = [];

    try {
      instances.push(new ShieldWalletAdapter());
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
  }, []);

  const onError = useCallback((error: Error) => {
    console.error('Wallet error:', error);
  }, []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      autoConnect={false}
      network={Network.TESTNET}
      decryptPermission={DecryptPermission.UponRequest}
      programs={PROGRAM_IDS}
=======
  const wallets = useMemo(
    () => {
      const adapters = [];

      // Leo Wallet (primary)
      try {
        adapters.push(
          new LeoWalletAdapter({
            appName: 'VeilProtocol',
          })
        );
      } catch (e) {
        console.warn('Leo Wallet adapter init failed:', e);
      }

      // Puzzle Wallet
      try {
        adapters.push(
          new PuzzleWalletAdapter({
            programIdPermissions: {
              [WalletAdapterNetwork.MainnetBeta]: PROGRAM_IDS,
              [WalletAdapterNetwork.TestnetBeta]: PROGRAM_IDS,
            },
            appName: 'VeilProtocol',
            appDescription: 'Voting & private auctions on Aleo blockchain',
          })
        );
      } catch (e) {
        console.warn('Puzzle Wallet adapter init failed:', e);
      }

      // Fox Wallet
      try {
        adapters.push(
          new FoxWalletAdapter({
            appName: 'VeilProtocol',
          })
        );
      } catch (e) {
        console.warn('Fox Wallet adapter init failed:', e);
      }

      // Soter Wallet
      try {
        adapters.push(
          new SoterWalletAdapter({
            appName: 'VeilProtocol',
          })
        );
      } catch (e) {
        console.warn('Soter Wallet adapter init failed:', e);
      }

      return adapters;
    },
    []
  );

  const onError = useCallback((error: Error) => {
    console.error('Wallet error:', error);

    // Handle specific wallet errors with user-friendly messages
    const errorMessage = error.message || '';

    if (errorMessage.includes('NETWORK_NOT_GRANTED') || errorMessage.includes('network')) {
      console.warn(
        'Network permission error: Please make sure your Leo Wallet is set to Testnet. ' +
        'Open your wallet extension, go to Settings > Network, and select "Testnet".'
      );
    }
  }, []);

  return (
    <WalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.OnChainHistory}
      programs={PROGRAM_IDS}
      autoConnect={false}
      network={WalletAdapterNetwork.TestnetBeta}
>>>>>>> 3f3da63b9a41d76fdc24cf22f7b5c9b54646e6ea
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
<<<<<<< HEAD
    </AleoWalletProvider>
=======
    </WalletProvider>
>>>>>>> 3f3da63b9a41d76fdc24cf22f7b5c9b54646e6ea
  );
}
