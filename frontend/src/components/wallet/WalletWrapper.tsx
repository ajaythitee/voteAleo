'use client';

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

// Program IDs for VeilProtocol (Voting + Auctions)
const VOTING_PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID || 'privote_voting_1001.aleo';
const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID || 'privote_auction_1001.aleo';
const PROGRAM_IDS = [VOTING_PROGRAM_ID, AUCTION_PROGRAM_ID, 'credits.aleo'];

interface WalletWrapperProps {
  children: ReactNode;
}

export function WalletWrapper({ children }: WalletWrapperProps) {
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
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
}
