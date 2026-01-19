'use client';

import { useMemo, ReactNode, useCallback } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { PuzzleWalletAdapter } from 'aleo-adapters';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';

// Program ID for VoteAleo
const PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID || 'vote_privacy_2985.aleo';

interface WalletWrapperProps {
  children: ReactNode;
}

export function WalletWrapper({ children }: WalletWrapperProps) {
  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'VoteAleo',
      }),
      new PuzzleWalletAdapter({
        programIdPermissions: {
          [WalletAdapterNetwork.MainnetBeta]: [PROGRAM_ID],
          [WalletAdapterNetwork.TestnetBeta]: [PROGRAM_ID],
        },
        appName: 'VoteAleo',
        appDescription: 'Privacy-preserving voting on Aleo blockchain',
      }),
    ],
    []
  );

  // Error handler
  const onError = useCallback((error: Error) => {
    console.error('Wallet error:', error);
  }, []);

  return (
    <WalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={WalletAdapterNetwork.TestnetBeta}
      programs={[PROGRAM_ID]}
      autoConnect
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
}
