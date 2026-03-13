'use client';

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

// Program IDs for VeilProtocol (Voting + Auctions)
const VOTING_PROGRAM_ID = process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID as string;
const AUCTION_PROGRAM_ID = process.env.NEXT_PUBLIC_AUCTION_PROGRAM_ID as string;
const PROGRAM_IDS = [VOTING_PROGRAM_ID, AUCTION_PROGRAM_ID, 'credits.aleo'];

interface WalletWrapperProps {
  children: ReactNode;
}

export function WalletWrapper({ children }: WalletWrapperProps) {
  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter(),
      new PuzzleWalletAdapter(),
      new LeoWalletAdapter(),
      new FoxWalletAdapter(),
      new SoterWalletAdapter(),
    ],
    []
  );

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
      onError={onError}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
}
