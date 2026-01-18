'use client';

import { ReactNode } from 'react';
import { WalletWrapper } from './wallet/WalletWrapper';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletWrapper>
      {children}
    </WalletWrapper>
  );
}
